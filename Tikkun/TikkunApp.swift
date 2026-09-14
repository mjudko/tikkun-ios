import SwiftUI

@main
struct TikkunApp: App {
    var body: some Scene {
        WindowGroup { LibraryView() }
    }
}

struct LibraryView: View {
    @State private var passages: [Passage] = []
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if let errorMessage {
                ContentUnavailableView("Unable to open the Torah", systemImage: "book.closed", description: Text(errorMessage))
            } else if passages.isEmpty {
                ProgressView("Opening your reader…")
            } else {
                ReaderView(passages: passages)
            }
        }
        .task {
            guard passages.isEmpty else { return }
            do {
                guard let url = Bundle.main.url(forResource: "learning-corpus", withExtension: "json") else {
                    throw CocoaError(.fileNoSuchFile)
                }
                passages = try await Task.detached(priority: .userInitiated) {
                    try JSONDecoder().decode([Passage].self, from: Data(contentsOf: url))
                }.value
            } catch {
                errorMessage = "The bundled reading data could not be loaded. \(error.localizedDescription)"
            }
        }
    }
}
