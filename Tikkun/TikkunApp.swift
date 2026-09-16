import SwiftUI

enum ColorSchemeSelection: String, CaseIterable, Identifiable {
    case system = "System"
    case light = "Light"
    case dark = "Dark"

    var id: String { self.rawValue }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

@main
struct TikkunApp: App {
    @AppStorage("colorSchemeSelection") private var colorSchemeSelection = ColorSchemeSelection.system

    init() { TorahFont.register() }

    var body: some Scene {
        WindowGroup {
            LibraryView()
                .preferredColorScheme(colorSchemeSelection.colorScheme)
        }
    }
}

struct LibraryView: View {
    @State private var passages: [Passage] = []
    @State private var columns: [TorahColumn] = []
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if let errorMessage {
                ContentUnavailableView("Unable to open the Torah", systemImage: "book.closed", description: Text(errorMessage))
            } else if passages.isEmpty {
                ProgressView("Opening your reader…")
            } else {
                ReaderView(passages: passages, columns: columns)
            }
        }
        .task {
            guard passages.isEmpty else { return }
            do {
                guard let url = Bundle.main.url(forResource: "learning-corpus", withExtension: "json") else {
                    throw CocoaError(.fileNoSuchFile)
                }
                guard let columnsURL = Bundle.main.url(forResource: "torah-columns", withExtension: "json") else {
                    throw CocoaError(.fileNoSuchFile)
                }
                columns = try await Task.detached(priority: .userInitiated) {
                    try JSONDecoder().decode([TorahColumn].self, from: Data(contentsOf: columnsURL))
                }.value
                passages = try await Task.detached(priority: .userInitiated) {
                    try JSONDecoder().decode([Passage].self, from: Data(contentsOf: url))
                }.value
            } catch {
                errorMessage = "The bundled reading data could not be loaded. \(error.localizedDescription)"
            }
        }
    }
}
