import Foundation

struct ReadingWord: Codable, Equatable, Sendable {
    let text: String
    let ketiv: String?
    let qeri: String?
    var upperReading: String? = nil
    var aliyah: Int? = nil
    var combinedAliyah: Int? = nil
    var readingText: String { upperReading ?? text }
}

enum AliyahLabel {
    static func hebrew(_ number: Int) -> String {
        switch number {
        case 1: return "ראשון"
        case 2: return "שני"
        case 3: return "שלישי"
        case 4: return "רביעי"
        case 5: return "חמישי"
        case 6: return "ששי"
        case 7: return "שביעי"
        case 8: return "מפטיר"
        default: return "עלייה \(number)"
        }
    }

    static func compact(_ number: Int) -> String {
        number == 8 ? "מ׳" : ["", "א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ז׳"][max(0, min(7, number))]
    }
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
    let verseCount: Int
    let approximateColumns: Double

    var lengthSummary: String {
        "\(verseCount) pesukim · ≈\(approximateColumns.formatted(.number.precision(.fractionLength(1)))) columns"
    }

    var bookName: String {
        ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"][max(0, min(4, book - 1))]
    }
}

/// Filters combining marks without changing the Hebrew consonants or punctuation.
/// Meteg and silluq share U+05BD and are both hidden with trope, as in the web reader.
enum HebrewText {
    static func display(_ text: String, vowels: Bool, trope: Bool, verseEndings: Bool = true) -> String {
        let scalars = text.decomposedStringWithCanonicalMapping.unicodeScalars.filter { scalar in
            let code = scalar.value
            if code == 0x05C3 { return verseEndings }
            if code == 0x05C0 { return trope }
            if (0x0591...0x05AE).contains(code) || code == 0x05BD { return trope }
            if (0x05B0...0x05BC).contains(code) || code == 0x05BF ||
                (0x05C1...0x05C2).contains(code) || code == 0x05C7 { return vowels }
            return true
        }
        return String(String.UnicodeScalarView(scalars)).precomposedStringWithCanonicalMapping
    }
}

struct TorahColumn: Codable, Identifiable, Sendable {
    let id: Int
    let rows: [TorahRow]
}

struct TorahRow: Codable, Sendable {
    /// Source columns, section fragments, then words. Retains internal gaps.
    let segments: [[[ReadingWord]]]
    let petucha: Bool
    var aliyah: Int? = nil
    var combinedAliyah: Int? = nil
}
