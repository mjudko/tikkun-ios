# Tikkun Koreh for iOS

A native SwiftUI learning reader for iPhone and iPad (iOS 17+). This independent
repository started from the web app at `../tikkun-koreh`; that project is unchanged.
The original web import is preserved in commit `08e6b70`. The native app has no
JavaScript runtime, package dependencies, server, or network requirement.

## Open and run

1. Open `Tikkun.xcodeproj` in Xcode.
2. Select the **Tikkun** scheme and an iPhone simulator.
3. Press Run.

To run on a physical device, choose your signing team under **Signing &
Capabilities**. `com.tikkunkoreh.app` is a development bundle identifier; replace
it with your own before distribution.

This Mac has Xcode installed but the global developer directory points to Command
Line Tools. For terminal commands, use the per-command override below; no global
configuration change is necessary.

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project Tikkun.xcodeproj -scheme Tikkun \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/tikkun-ios-build CODE_SIGNING_ALLOWED=NO build
```

## First milestone

- Continuous flowing text across verse boundaries, with tappable words.
- The site’s bundled Shlomo Stam Hebrew font in flowing text and word study.
- A parchment-style Torah-column view with 42 source rows, justified text,
  section gaps, and amud navigation; switch back to flowing text at any time.
- Searchable selection of all 54 parshiot, grouped by book.
- Independent vowel and trope practice controls.
- Tap a word to inspect its marked/unmarked forms and qeri/ketiv, where present.
- Adjustable text size and line spacing, including Dynamic Type scaling.
- Passage selection and display preferences saved between launches.
- Complete offline text, derived from the 245-amud snapshot.

## Structure

- `Tikkun/ReaderView.swift`: reading screen, passage picker, settings, word study.
- `Tikkun/TorahColumnView.swift`: native Core Text column shaping and drawing.
- `Tikkun/TorahFont.swift`: registration of the site’s bundled Hebrew font.
- `Tikkun/Core/ReadingModels.swift`: data models and Hebrew mark filtering.
- `Tikkun/Resources/learning-corpus.json`: generated reading data bundled in the app.
- `SourceData/`: original Torah snapshot, manifest, license, and parsha catalog.
- `scripts/prepare_learning_corpus.py`: deterministic conversion with checksum and
  qeri/ketiv checks. Run it after intentional changes to source data.
- `Tests/`: Swift unit tests, runnable through the standalone Swift package.

## Validation

```sh
python3 scripts/prepare_learning_corpus.py
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  /Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/swift test
```

Inside a restricted development sandbox, SwiftPM's nested sandbox may not start.
Use `swift test --disable-sandbox --cache-path /tmp/tikkun-swiftpm-cache
--scratch-path /tmp/tikkun-core-build` in that environment.

The conversion checks all 245 original page hashes and all 33 qeri/ketiv pairs.
Printed rows are joined before splitting at sof pasuq, including across amud
boundaries. Parsha starts can occur inside a printed row. Reading blocks are not
assigned inferred verse numbers: the snapshot contains 5,852 sof-pasuq blocks
and 5,846 verse references, including alternate accentuation. Explicit verse
mapping needs a separate audit before verse-range selection is added.

## Next milestones

- Aliyah and verse-range selection with verified boundaries.
- Named cantillation explanations and richer word study.
- Saved reading position, bookmarks, and rehearsal progress.
- Column zoom and richer interaction within the fixed-row view.
- Device/VoiceOver testing, app icon, and distribution setup.

The column view preserves source line breaks and uses native word-space
justification. It is not a pixel-for-pixel reproduction of the site’s experimental
letter stretching or special poetry fitting. It displays the read-aloud (qeri)
text with optional marks; full amudim can include adjacent parshiot. Text size and
line-spacing settings apply to flowing text, while columns fit their available
width. Word inspection is currently available in flowing text.

Torah columns always hide sof pasuq (the verse-ending colon), regardless of the
vowel and trope settings. Flowing text retains verse punctuation.

The initial version preserves extraordinary dots and inverted nuns
when hiding marks. Meteg/silluq is hidden with trope, matching the web reader.
A screen-size or marks change can reflow text; an exact reading-position anchor
across reflow is not implemented yet.

## Text provenance

Source: [Tikkun.io](https://github.com/akivajgordon/tikkun.io), pinned in the web
project on 2026-08-13. See `SourceData/corpus-manifest.json` and
`SourceData/tikkun-io-LICENSE.txt`. The source license is also bundled with the app.
Original web source commit: `951fed6ade8b6dbad44972b90a7d3fcc8c0aa967`.
