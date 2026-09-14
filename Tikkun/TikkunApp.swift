import SwiftUI

@main
struct TikkunApp: App {
    init() { TorahFont.register() }

    var body: some Scene {
        WindowGroup { LibraryView() }
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
