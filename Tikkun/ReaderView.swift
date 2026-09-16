import SwiftUI

private enum ReaderSheet: String, Identifiable {
    case passages, settings
    var id: String { rawValue }
}

struct ReaderView: View {
    let passages: [Passage]
    let columns: [TorahColumn]
    @AppStorage("selectedPassage") private var selectedID = "bereshit"
    @AppStorage("showVowels") private var vowels = true
    @AppStorage("showTrope") private var trope = true
    @AppStorage("readingSize") private var readingSize = 30.0
    @AppStorage("readingSpacing") private var readingSpacing = 12.0
    @AppStorage("torahColumnLayout") private var columnLayout = true
    @State private var columnOffset = 0
    @State private var sheet: ReaderSheet?
    @ScaledMetric(relativeTo: .title) private var scale = 1.0

    private var passage: Passage { passages.first { $0.id == selectedID } ?? passages[0] }
    private var passageIndex: Int { passages.firstIndex { $0.id == passage.id } ?? 0 }

    private var passageColumns: [TorahColumn] {
        let first = passage.blocks.first?.amud ?? 1
        let last = passage.blocks.last?.amud ?? first
        return columns.filter { (first...last).contains($0.id) }
    }
    private var activeColumn: TorahColumn? {
        guard !passageColumns.isEmpty else { return nil }
        return passageColumns[min(columnOffset, passageColumns.count - 1)]
    }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 28) {
                        header.padding(.horizontal, columnLayout ? 24 : 0).id("top")
                        Picker("Reading layout", selection: $columnLayout) {
                            Text("Torah column").tag(true)
                            Text("Flowing text").tag(false)
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal, columnLayout ? 24 : 0)
                        if columnLayout, let activeColumn {
                            columnNavigation.padding(.horizontal, 24)
                            TorahColumnView(column: activeColumn, vowels: vowels, trope: trope)
                            Text("Full amud · may include text from an adjacent parsha. Marks follow your practice settings.")
                                .font(.caption).foregroundStyle(.secondary)
                                .padding(.horizontal, 24)
                            columnNavigation.padding(.horizontal, 24)
                        } else {
                            FlowingTextView(words: flowingWords, fontSize: readingSize * scale,
                                            lineSpacing: readingSpacing, vowels: vowels, trope: trope)
                        }
                        passageNavigation.padding(.horizontal, columnLayout ? 24 : 0)
                    }
                    .padding(.horizontal, columnLayout ? 0 : 24)
                    .padding(.vertical, 24)
                    .frame(maxWidth: 720)
                    .frame(maxWidth: .infinity)
                }
                .onChange(of: selectedID) { _, _ in columnOffset = 0; proxy.scrollTo("top", anchor: .top) }
                .onChange(of: columnOffset) { _, _ in proxy.scrollTo("top", anchor: .top) }
                .background(Color(.systemGroupedBackground))
                .safeAreaInset(edge: .bottom, spacing: 0) { practiceBar }
            }
            .navigationTitle("Tikkun")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { sheet = .passages } label: { Label("Choose passage", systemImage: "books.vertical") }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { sheet = .settings } label: { Label("Reading settings", systemImage: "textformat.size") }
                }
            }
            .sheet(item: $sheet) { destination in
                switch destination {
                case .passages: passagePicker
                case .settings: settings
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text(passage.name).font(.largeTitle.weight(.semibold))
                Spacer()
                Text(passage.hebrew).font(.title2).environment(\.layoutDirection, .rightToLeft)
            }
            Text(passage.bookName).font(.subheadline).foregroundStyle(.secondary)
            Text(passage.lengthSummary).font(.subheadline).foregroundStyle(.secondary)
            Text(columnLayout ? "Practice from a Torah-style column. Show or hide the marks as you learn." : "Read with the marks, then hide them to practice.")
                .font(.subheadline).foregroundStyle(.secondary).padding(.top, 4)
        }
        .padding(.bottom, 8)
    }

    private var columnNavigation: some View {
        HStack {
            Button { columnOffset = max(0, columnOffset - 1) } label: {
                Label("Previous amud", systemImage: "chevron.left").labelStyle(.iconOnly)
            }.disabled(columnOffset == 0).frame(minWidth: 44, minHeight: 44)
            Spacer()
            Text("Amud \(activeColumn?.id ?? 1) · \(columnOffset + 1) of \(passageColumns.count)")
                .font(.subheadline).monospacedDigit()
            Spacer()
            Button { columnOffset = min(passageColumns.count - 1, columnOffset + 1) } label: {
                Label("Next amud", systemImage: "chevron.right").labelStyle(.iconOnly)
            }.disabled(columnOffset >= passageColumns.count - 1).frame(minWidth: 44, minHeight: 44)
        }
    }

    private var practiceBar: some View {
        HStack(spacing: 12) {
            practiceButton("Vowels", hebrew: "אָ", isOn: $vowels)
            practiceButton("Trope", hebrew: "א֑", isOn: $trope)
        }
        .padding(.horizontal, 24).padding(.vertical, 12)
        .background(.regularMaterial)
    }

    private func practiceButton(_ title: String, hebrew: String, isOn: Binding<Bool>) -> some View {
        Button { isOn.wrappedValue.toggle() } label: {
            HStack {
                Text(hebrew).font(.title3)
                Text(title).font(.subheadline.weight(.medium))
                Spacer(minLength: 4)
                Image(systemName: isOn.wrappedValue ? "checkmark.circle.fill" : "circle")
            }
            .padding(.horizontal, 14).frame(minHeight: 48)
            .background(isOn.wrappedValue ? Color.accentColor.opacity(0.12) : Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
        .accessibilityValue(isOn.wrappedValue ? "Shown" : "Hidden")
        .accessibilityHint("Double tap to \(isOn.wrappedValue ? "hide" : "show") \(title.lowercased())")
    }

    private var flowingWords: [ReadingWord] { passage.blocks.flatMap(\.words) }

    private var passageNavigation: some View {
        HStack {
            Button("Previous parsha", systemImage: "chevron.left") { selectedID = passages[passageIndex - 1].id }
                .disabled(passageIndex == 0)
            Spacer()
            Button("Next parsha", systemImage: "chevron.right") { selectedID = passages[passageIndex + 1].id }
                .disabled(passageIndex == passages.count - 1)
        }
        .font(.subheadline).padding(.vertical, 12)
    }

    private var passagePicker: some View {
        PassagePicker(passages: passages, selectedID: $selectedID)
    }

    private var settings: some View {
        NavigationStack {
            Form {
                Section("Flowing text size") {
                    Slider(value: $readingSize, in: 22...46, step: 2) { Text("Text size") }
                    Text("\(Int(readingSize)) pt, adjusted for your device’s text-size setting")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Section("Flowing text spacing") {
                    Slider(value: $readingSpacing, in: 4...24, step: 2) { Text("Line spacing") }
                }
                Section("Preview") {
                    Text(HebrewText.display("בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים", vowels: vowels, trope: trope))
                        .font(TorahFont.font(readingSize * scale))
                        .lineSpacing(readingSpacing).frame(maxWidth: .infinity, alignment: .trailing)
                        .environment(\.layoutDirection, .rightToLeft)
                }
            }
            .navigationTitle("Reading settings").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { sheet = nil } } }
        }
        .presentationDetents([.medium, .large])
    }
}

private struct PassagePicker: View {
    let passages: [Passage]
    @Binding var selectedID: String
    @State private var query = ""
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(1...5, id: \.self) { book in
                    let matching = passages.filter {
                        $0.book == book && (query.isEmpty || $0.name.localizedCaseInsensitiveContains(query) || $0.hebrew.contains(query))
                    }
                    if let first = matching.first {
                        Section(first.bookName) {
                            ForEach(matching) { passage in
                                Button {
                                    selectedID = passage.id
                                    dismiss()
                                } label: {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(passage.name).foregroundStyle(.primary)
                                            Text(passage.lengthSummary).font(.caption).foregroundStyle(.secondary)
                                        }
                                        Spacer()
                                        Text(passage.hebrew).foregroundStyle(.secondary)
                                        if selectedID == passage.id { Image(systemName: "checkmark").accessibilityLabel("Selected") }
                                    }.frame(minHeight: 32)
                                }
                            }
                        }
                    }
                }
            }
            .searchable(text: $query, prompt: "Find a parsha")
            .navigationTitle("Choose a passage")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}
