import Foundation

struct ReadingWord: Codable, Equatable, Sendable {
    let text: String
    let ketiv: String?
    let qeri: String?
}

struct ReadingBlock: Codable, Identifiable, Sendable {
    let id: String
    let amud: Int
    let words: [ReadingWord]
}

struct Passage: Codable, Identifiable, Sendable {
    let id: String
    let hebrew: String
    let name: String
    let book: Int
    let blocks: [ReadingBlock]

    var bookName: String {
        ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"][max(0, min(4, book - 1))]
    }
}

/// Filters combining marks without changing the Hebrew consonants or punctuation.
/// Meteg and silluq share U+05BD and are both hidden with trope, as in the web reader.
enum HebrewText {
    static func display(_ text: String, vowels: Bool, trope: Bool) -> String {
        let scalars = text.decomposedStringWithCanonicalMapping.unicodeScalars.filter { scalar in
            let code = scalar.value
            if (0x0591...0x05AE).contains(code) || code == 0x05BD { return trope }
            if (0x05B0...0x05BC).contains(code) || code == 0x05BF ||
                (0x05C1...0x05C2).contains(code) || code == 0x05C7 { return vowels }
            return true
        }
        return String(String.UnicodeScalarView(scalars)).precomposedStringWithCanonicalMapping
    }
}
