"use client";

import { Fragment, type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { activeParshaForPage, approximateParshaColumns, currentWeekParshaPage, doubleParshaForSlug, parshaForSlug, parshiot, sefarim } from "./lib/catalog";
import { variableGapAllocations } from "./lib/spacing";
import {
  accentByCode,
  aliyotForReading,
  type AliyahStart,
  consonants,
  type AccentMeta,
  type AccentRank,
  type DisplayLine,
  filterPracticeWord,
  marksForWord,
  metegMeta,
  normalizePageData,
  parseFragment,
  phraseHighlightsForTokens,
  PHYSICAL_LINES,
  primaryRanks,
  type PrimaryRank,
  rankDetails,
  setumaBreakCount,
  silluqMeta,
  specialGlyphs,
  terminalTorahLineIndex,
  type PracticeOptions,
} from "./lib/tikkun";

type ViewMode = "facing" | "combined" | "scroll" | "practice";
type ExperimentalWidthTier = 1 | 2 | 3;
type LineSpacing = "standard" | "relaxed" | "wide" | "extra-wide";

const lamedPattern = /ל/;
const roofLetterPattern = /[בדהחכמםרת]/;

type PageToken = {
  page: number;
  id: string;
  word: string;
  display: string;
  lineIndex: number;
  sourceLine: number | null;
  marks: AccentMeta[];
  ketiv?: string;
  qeri?: string;
};

type CorpusManifest = {
  edition: string;
  pinnedOn: string;
  sourceRows: number;
  physicalRowsAfterNormalization: number;
  qeriKetiv: number;
  puncta: number;
  invertedNuns: number;
  petuchot: number;
  setumot: number;
};

const MAX_PAGE = 245;
const MIN_ZOOM = 80;
const MAX_ZOOM = 170;
const ZOOM_STEP = 10;
const SETUMA_MIN_GAP_EM = 5.95;
const JUSTIFY_MAX_FONT_FACTOR = 1.14;
const JUSTIFY_MAX_WORD_SPACE_EM = 0.62;
const JUSTIFY_MAX_WORD_COMPRESSION_EM = 0.18;
// Paragraph breaks use their own traditional measure. They must not inherit
// the aggressive ordinary-line closing pass or their reserved white space
// becomes distorted.
const SECTION_MAX_WORD_SPACE_EM = 0.42;
const SECTION_MAX_WORD_COMPRESSION_EM = 0.12;
const COMPOSER_PREFERRED_MAX_FONT_FACTOR = 1.035;
const COMPOSER_PREFERRED_MIN_FONT_FACTOR = 0.97;
const COMPOSER_HARD_MAX_FONT_FACTOR = 1.1;
const COMPOSER_HARD_MIN_FONT_FACTOR = 0.93;
const OUTLIER_HARD_MAX_FONT_FACTOR = 1.125;
const rankOrder: AccentRank[] = ["emperor", "king", "duke", "count", "servant", "auxiliary", "punctuation"];
const aliyahLabels = ["", "א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ז׳"];

const blankLines = () => Array.from({ length: PHYSICAL_LINES }, (): DisplayLine => ({
  columns: [[""]], petucha: false, sourceLine: null, kind: "ordinary",
}));

function tokenId(lineIndex: number, columnIndex: number, fragmentIndex: number, tokenIndex: number) {
  return `${lineIndex}-${columnIndex}-${fragmentIndex}-${tokenIndex}`;
}

function tokensForPage(lines: DisplayLine[], page: number): PageToken[] {
  return lines.flatMap((line, lineIndex) => line.columns.flatMap((column, columnIndex) => column.flatMap((fragment, fragmentIndex) =>
    parseFragment(fragment, "practice", true).map((token, tokenIndex) => {
      const marks = marksForWord(token.rawPractice);
      return {
        page,
        id: tokenId(lineIndex, columnIndex, fragmentIndex, tokenIndex),
        word: token.rawPractice,
        display: token.display,
        lineIndex,
        sourceLine: line.sourceLine,
        marks,
        ketiv: token.ketiv,
        qeri: token.qeri,
      };
    }),
  )));
}

function Toggle({ checked, label, disabled, onChange }: { checked: boolean; label: string; disabled?: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} className={`switch ${checked ? "on" : ""}`} onClick={onChange}>
      <i />
    </button>
  );
}

type FitProfile = false | "ordinary" | "ordinary-outlier" | "poetry-slot";

function FittedFragment({ children, className, fit, measureKey, wordCount, experimentalWidths, experimentalWidthTier, variableWordSpacing, composerV2 }: {
  children: ReactNode;
  className: string;
  fit: FitProfile;
  measureKey: string;
  wordCount: number;
  experimentalWidths: boolean;
  experimentalWidthTier: ExperimentalWidthTier;
  variableWordSpacing: boolean;
  composerV2: boolean;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const tokens = [...content.querySelectorAll<HTMLElement>(".line-token")];
    const reset = () => {
      container.style.setProperty("--fit-font-factor", "1");
      container.style.setProperty("--fit-word-spacing", "0px");
      container.removeAttribute("data-fit-factor");
      container.removeAttribute("data-fit-residual");
      container.removeAttribute("data-fit-profile");
      tokens.forEach((token) => {
        token.removeAttribute("data-width-variant");
        token.style.marginInlineStart = "0px";
      });
    };
    reset();
    // Section lines are spaced by their column-level fitter so their reserved
    // paragraph opening can be measured independently from each text fragment.
    if (!fit || wordCount < 2) return;

    const update = () => {
      reset();
      const available = container.getBoundingClientRect().width;
      const baseSize = Number.parseFloat(getComputedStyle(container).fontSize) || 15;
      if (!available) return;

      const measureNaturalWidth = () => content.getBoundingClientRect().width;
      let natural = measureNaturalWidth();
      if (fit === "poetry-slot") {
        if (!natural) return;
        const factor = Math.min(1, (available - 0.25) / natural);
        container.style.setProperty("--fit-font-factor", factor.toFixed(4));
        const finalWidth = content.getBoundingClientRect().width;
        container.dataset.fitProfile = fit;
        container.dataset.fitFactor = factor.toFixed(4);
        container.dataset.fitResidual = (available - finalWidth).toFixed(2);
        return;
      }
      const gaps = Math.max(1, wordCount - 1);
      const maximumWidthTier = fit === "ordinary-outlier" ? 3 : experimentalWidthTier;
      const preferredMaxFactor = fit === "ordinary-outlier" ? OUTLIER_HARD_MAX_FONT_FACTOR : composerV2 ? COMPOSER_PREFERRED_MAX_FONT_FACTOR : JUSTIFY_MAX_FONT_FACTOR;
      const preferredMinFactor = composerV2 ? COMPOSER_PREFERRED_MIN_FONT_FACTOR : 0.9;
      const hardMaxFactor = fit === "ordinary-outlier" ? OUTLIER_HARD_MAX_FONT_FACTOR : composerV2 ? COMPOSER_HARD_MAX_FONT_FACTOR : JUSTIFY_MAX_FONT_FACTOR;
      const hardMinFactor = composerV2 ? COMPOSER_HARD_MIN_FONT_FACTOR : 0.84;
      if (experimentalWidths && tokens.length) {
        const candidates = tokens.filter((token) => (token.textContent?.match(/[א-ת]/g)?.length ?? 0) >= 2);
        const distributed = [
          ...candidates.filter((_, index) => index % 2 === 0),
          ...candidates.filter((_, index) => index % 2 === 1),
        ];
        const maximumSpacing = baseSize * JUSTIFY_MAX_WORD_SPACE_EM * gaps;
        const maximumCompression = baseSize * JUSTIFY_MAX_WORD_COMPRESSION_EM * gaps;
        const minimumNaturalWidth = Math.max(0, (available - maximumSpacing) / preferredMaxFactor);

        if (natural < minimumNaturalWidth) {
          const applyVariantUntilFilled = (variantTokens: HTMLElement[], variant: string) => {
            for (const token of variantTokens) {
              token.dataset.widthVariant = variant;
              natural = measureNaturalWidth();
              if (natural >= minimumNaturalWidth) return true;
            }
            return false;
          };

          // Start with the modest all-letter master. If the line is still short,
          // progressively upgrade lamed-bearing words, then broad-roof letters.
          // Each pass stops at the first form that supplies enough width.
          applyVariantUntilFilled(distributed, "wide");
          const lamedCandidates = distributed.filter((token) => lamedPattern.test(token.textContent ?? ""));
          const roofCandidates = distributed.filter((token) =>
            !lamedPattern.test(token.textContent ?? "") && roofLetterPattern.test(token.textContent ?? ""),
          );
          for (let tier = 1; tier <= maximumWidthTier && natural < minimumNaturalWidth; tier += 1) {
            applyVariantUntilFilled(lamedCandidates, `scribe-${tier}`);
          }
          for (let tier = 1; tier <= maximumWidthTier && natural < minimumNaturalWidth; tier += 1) {
            applyVariantUntilFilled(roofCandidates, `scribe-${tier}`);
          }
        } else {
          const maximumNaturalWidth = (available + maximumCompression) / preferredMinFactor;
          if (natural > maximumNaturalWidth) {
            for (const token of distributed) {
              token.dataset.widthVariant = "narrow";
              natural = measureNaturalWidth();
              if (natural <= maximumNaturalWidth) break;
            }
          }
        }
      }

      if (!natural) return;
      const maximumGapExtra = baseSize * JUSTIFY_MAX_WORD_SPACE_EM;
      const maximumGapCompression = baseSize * JUSTIFY_MAX_WORD_COMPRESSION_EM;
      const gapTokens = tokens.slice(1);
      const canVaryGaps = variableWordSpacing && experimentalWidths && gapTokens.length > 0;
      const minimumSpacingBudget = canVaryGaps ? -maximumGapCompression * gaps : 0;
      const targetFactor = natural > available && canVaryGaps
        ? Math.min(1, (available - minimumSpacingBudget) / natural)
        : available / natural;
      const factor = Math.min(hardMaxFactor, Math.max(hardMinFactor, targetFactor));
      const remaining = available - natural * factor - 0.5;

      const setSpacingBudget = (requestedTotal: number, closeLine = false) => {
        const requiredAverage = requestedTotal / gaps;
        const gapExtra = closeLine ? Math.max(maximumGapExtra, requiredAverage > 0 ? requiredAverage + 0.5 : 0) : maximumGapExtra;
        const gapCompression = closeLine ? Math.max(maximumGapCompression, requiredAverage < 0 ? -requiredAverage + 0.5 : 0) : maximumGapCompression;
        const minimumTotal = canVaryGaps ? -gapCompression * gaps : 0;
        const total = Math.min(gapExtra * gaps, Math.max(minimumTotal, requestedTotal));
        gapTokens.forEach((token) => { token.style.marginInlineStart = "0px"; });
        if (!canVaryGaps) {
          const uniform = Math.min(maximumGapExtra, Math.max(0, total / gaps));
          container.style.setProperty("--fit-word-spacing", `${uniform.toFixed(2)}px`);
          return uniform * gaps;
        }

        container.style.setProperty("--fit-word-spacing", "0px");
        const letterCounts = tokens.map((token) => token.textContent?.match(/[א-ת]/g)?.length ?? 1);
        const pairLengths = gapTokens.map((_, index) => letterCounts[index] + letterCounts[index + 1]);
        const allocations = variableGapAllocations(total, gapExtra, gapCompression, pairLengths);
        gapTokens.forEach((token, index) => {
          token.style.marginInlineStart = `${allocations[index].toFixed(2)}px`;
        });
        return allocations.reduce((sum, value) => sum + value, 0);
      };

      container.style.setProperty("--fit-font-factor", factor.toFixed(4));
      let spacingBudget = setSpacingBudget(remaining);

      // TrueType hinting can shift advances slightly at the fitted font size.
      // Measure the actual result and close the line in either direction. The
      // adaptive final pass only exceeds the preferred gap range when that is
      // required to prevent an overfull or visibly short ordinary line.
      let rendered = content.getBoundingClientRect().width;
      const targetWidth = available - 0.5;
      for (let correction = 0; correction < 3 && Math.abs(targetWidth - rendered) > 0.35; correction += 1) {
        spacingBudget = setSpacingBudget(spacingBudget + targetWidth - rendered, true);
        rendered = content.getBoundingClientRect().width;
      }
      const finalWidth = content.getBoundingClientRect().width;
      container.dataset.fitProfile = fit;
      container.dataset.fitFactor = (Number.parseFloat(container.style.getPropertyValue("--fit-font-factor")) || 1).toFixed(4);
      container.dataset.fitResidual = (available - finalWidth).toFixed(2);
    };

    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(update);
    });
    observer.observe(container);
    const frame = requestAnimationFrame(update);
    let active = true;
    const fontsReady = experimentalWidths
      ? Promise.all([
        document.fonts.load('1em "Tikkun Stam Prototype Wide"'),
        document.fonts.load('1em "Tikkun Stam Prototype Narrow"'),
        ...Array.from({ length: fit === "ordinary-outlier" ? 3 : experimentalWidthTier }, (_, index) =>
          document.fonts.load(`1em "Tikkun Stam Prototype Scribe${index + 1}"`),
        ),
      ])
      : document.fonts?.ready;
    fontsReady?.then(() => { if (active) update(); });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
    };
  }, [composerV2, experimentalWidthTier, experimentalWidths, fit, measureKey, variableWordSpacing, wordCount]);

  return <span ref={containerRef} className={className}><span ref={contentRef} className="line-content">{children}</span></span>;
}

function SectionColumn({ children, breakCount, measureKey, sectionType, experimentalWidths, variableWordSpacing, composerV2 }: {
  children: ReactNode;
  breakCount: number;
  measureKey: string;
  sectionType: "petucha" | "setuma";
  experimentalWidths: boolean;
  variableWordSpacing: boolean;
  composerV2: boolean;
}) {
  const columnRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const column = columnRef.current;
    if (!column || breakCount < 1) return;

    const update = () => {
      column.style.setProperty("--section-font-factor", "1");
      const contents = [...column.querySelectorAll<HTMLElement>(".line-content")];
      const gapEntries = contents.flatMap((content) => {
        const fragmentTokens = [...content.querySelectorAll<HTMLElement>(".line-token")];
        return fragmentTokens.slice(1).map((token, index) => ({
          token,
          pairLength: (fragmentTokens[index].textContent?.match(/[א-ת]/g)?.length ?? 1)
            + (token.textContent?.match(/[א-ת]/g)?.length ?? 1),
        }));
      });
      gapEntries.forEach(({ token }) => { token.style.marginInlineStart = "0px"; });
      const available = column.clientWidth;
      const baseSize = Number.parseFloat(getComputedStyle(column).fontSize) || 14;
      const naturalTextWidth = contents.reduce((sum, content) => sum + content.getBoundingClientRect().width, 0);
      const minimumBreakWidth = baseSize * SETUMA_MIN_GAP_EM * breakCount;
      if (!available || !naturalTextWidth) return;
      const maximumGapExtra = baseSize * SECTION_MAX_WORD_SPACE_EM;
      const maximumGapCompression = baseSize * SECTION_MAX_WORD_COMPRESSION_EM;
      const canVaryGaps = experimentalWidths && variableWordSpacing && gapEntries.length > 0;
      const naturalTotal = naturalTextWidth + minimumBreakWidth;
      const minimumSpacingBudget = canVaryGaps ? -maximumGapCompression * gapEntries.length : 0;
      const factor = naturalTotal > available
        ? Math.max(composerV2 ? COMPOSER_HARD_MIN_FONT_FACTOR : 0.9, Math.min(1, (available - minimumSpacingBudget) / naturalTotal))
        : 1;
      column.style.setProperty("--section-font-factor", factor.toFixed(4));
      if (!canVaryGaps) return;
      const spacingBudget = available - naturalTotal * factor - 0.5;
      const allocations = variableGapAllocations(spacingBudget, maximumGapExtra, maximumGapCompression, gapEntries.map(({ pairLength }) => pairLength));
      gapEntries.forEach(({ token }, index) => {
        token.style.marginInlineStart = `${allocations[index].toFixed(2)}px`;
      });
    };

    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(update);
    });
    observer.observe(column);
    const frame = requestAnimationFrame(update);
    let active = true;
    document.fonts?.ready.then(() => { if (active) update(); });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
    };
  }, [breakCount, composerV2, experimentalWidths, measureKey, sectionType, variableWordSpacing]);

  return <span ref={columnRef} className={`line-column section-column ${sectionType}-column`}>{children}</span>;
}

function SpecialWord({ text, page, sourceLine, enabled }: { text: string; page: number; sourceLine: number | null; enabled: boolean }) {
  const plain = consonants(text);
  const special = enabled ? specialGlyphs.find((item) =>
    item.page === page && (!item.sourceLine || item.sourceLine === sourceLine) && plain.includes(item.word),
  ) : undefined;
  if (!special) return <>{text}</>;
  const start = plain.indexOf(special.word);
  const target = start + special.baseIndex;
  let baseIndex = -1;
  return <>{Array.from(text).map((character, index) => {
    if (/[א-ת]/.test(character)) baseIndex += 1;
    return baseIndex === target
      ? <span className={`special-letter ${special.className}`} title={special.label} key={`${character}-${index}`}>{character}</span>
      : <Fragment key={`${character}-${index}`}>{character}</Fragment>;
  })}</>;
}

function TikkunPage({
  annotated,
  lines,
  page,
  options,
  qeriNotices,
  experimentalWidths,
  experimentalWidthTier,
  variableWordSpacing,
  composerV2,
  balancedPoetry,
  lineSpacing,
  showAliyot,
  aliyahMode,
  doubleParshaStarts,
  pageParshaOverride,
  boldMarks,
  phraseHighlighting,
  selectedId,
  practiceTokens,
  onSelectToken,
}: {
  annotated?: boolean;
  lines: DisplayLine[];
  page: number;
  options: PracticeOptions;
  qeriNotices: boolean;
  experimentalWidths: boolean;
  experimentalWidthTier: ExperimentalWidthTier;
  variableWordSpacing: boolean;
  composerV2: boolean;
  balancedPoetry: boolean;
  lineSpacing: LineSpacing;
  showAliyot: boolean;
  aliyahMode: "standard" | "double";
  doubleParshaStarts?: AliyahStart[];
  pageParshaOverride?: { hebrew: string; english: string };
  boldMarks: boolean;
  phraseHighlighting: boolean;
  selectedId: string | null;
  practiceTokens: PageToken[];
  onSelectToken: (token: PageToken) => void;
}) {
  const tokenLookup = useMemo(() => new Map(practiceTokens.map((token) => [token.id, token])), [practiceTokens]);
  const phraseHighlights = useMemo(() => phraseHighlightsForTokens(practiceTokens), [practiceTokens]);
  const inspectable = useMemo(() => practiceTokens.filter((token) => token.marks.length > 0 || token.qeri), [practiceTokens]);
  const pageParsha = pageParshaOverride ?? activeParshaForPage(page);

  const moveInspector = (direction: number) => {
    if (!inspectable.length) return;
    const current = inspectable.findIndex((token) => token.id === selectedId);
    const next = current < 0 ? 0 : (current + direction + inspectable.length) % inspectable.length;
    onSelectToken(inspectable[next]);
  };
  const terminalLineIndex = terminalTorahLineIndex(lines, page);

  return (
    <article className={`paper ${annotated ? "practice-paper" : "scroll-paper"} ${composerV2 ? "composer-v2" : ""} ${balancedPoetry ? "balanced-poetry" : ""} ${page === 78 ? "shirat-hayam-page" : ""} ${boldMarks ? "bold-marks" : ""} ${annotated && phraseHighlighting ? "phrase-highlighting" : ""} line-spacing-${lineSpacing}`} aria-label={annotated ? "Practice page" : "Torah scroll page"}>
      <div className="paper-heading"><span className={annotated ? "practice-heading-left" : undefined}>{annotated ? <><span>עמוד לימוד</span><span className="practice-parsha-label" dir="rtl"><b>{pageParsha.hebrew}</b><small>{pageParsha.english}</small></span></> : "ספר תורה"}</span><span>עמוד {page}</span></div>
      <div
        className="torah-lines"
        dir="rtl"
        lang="he"
        tabIndex={annotated ? 0 : undefined}
        aria-label={annotated ? "Practice text. Use the left and right arrow keys to inspect marked words." : undefined}
        onKeyDown={annotated ? (event) => {
          if (event.key === "ArrowLeft") { event.preventDefault(); moveInspector(1); }
          if (event.key === "ArrowRight") { event.preventDefault(); moveInspector(-1); }
        } : undefined}
      >
        {lines.map((line, lineIndex) => {
          const lineAliyot = aliyotForReading(line, page, aliyahMode, doubleParshaStarts);
          const isTerminalTorahLine = lineIndex === terminalLineIndex;
          const setumaBreaks = setumaBreakCount(line);
          const hasSetuma = setumaBreaks > 0;
          const hasMultipleColumns = line.columns.length > 1;
          const classes = [
            "torah-line",
            line.petucha ? "petucha-line" : "",
            hasSetuma ? "setuma-line" : "",
            hasMultipleColumns ? "multi-column-line" : "",
            line.kind === "book-gap" ? "book-gap-line" : "",
            line.kind === "shirat-hayam" ? "shirat-hayam-line" : "",
            page === 78 && line.kind === "ordinary" ? "shirat-context-line" : "",
            line.kind === "haazinu" ? "haazinu-line" : "",
            line.songPattern ? `song-${line.songPattern}` : "",
          ].filter(Boolean).join(" ");
          return (
            <div
              className={classes}
              key={`${page}-${lineIndex}`}
              data-source-line={line.sourceLine ?? undefined}
              data-section-break={line.petucha ? "petucha" : hasSetuma ? "setuma" : undefined}
              data-setuma-breaks={hasSetuma ? setumaBreaks : undefined}
            >
              {annotated && showAliyot && lineAliyot.length ? <span className="aliyah-marker" dir="ltr" aria-label={`Aliyah ${lineAliyot.join(", ")}`}>{lineAliyot.map((aliyah) => aliyahLabels[aliyah] ?? aliyah).join(" ")}</span> : null}
              <span className="line-text">
                {line.columns.map((column, columnIndex) => {
                  const columnBreaks = line.kind === "ordinary" ? Math.max(0, column.filter((fragment) => fragment.trim()).length - 1) : 0;
                  const columnKey = `${page}-${lineIndex}-${columnIndex}-${annotated ? "practice" : "scroll"}-${column.join("|")}-${options.nekudot}-${options.trop}-${options.scribalMarks}`;
                  const fragments = column.map((fragment, fragmentIndex) => {
                      const parsed = parseFragment(fragment, annotated ? "practice" : "scroll", options.scribalMarks);
                      const sourceKey = parsed.map((token) => token.display).join(" ");
                      // The opening "Az Yashir" row is a full-width heading to the
                      // brickwork, rather than a brick itself. Compose it like an
                      // ordinary prose row so it reaches both margins.
                      const isShiratHayamOpening = line.kind === "shirat-hayam" && line.songPattern === "opening";
                      const fit: FitProfile = isShiratHayamOpening && parsed.length > 1
                        ? "ordinary"
                        : balancedPoetry && page === 242 && line.sourceLine === 2 && parsed.length > 0
                        ? "ordinary-outlier"
                        : !isTerminalTorahLine && !line.petucha && !hasSetuma && line.kind === "ordinary" && parsed.length > 0
                          ? "ordinary"
                        : balancedPoetry && line.kind === "shirat-hayam" && parsed.length > 1
                            ? "poetry-slot"
                            : false;
                      return (
                        <Fragment key={fragmentIndex}>
                          {fragmentIndex > 0 && columnBreaks > 0 ? <span className="section-gap" aria-hidden="true" data-section-break="setuma" /> : null}
                          <FittedFragment
                            className={`line-fragment ${columnBreaks > 0 ? "setuma-fragment" : ""}`}
                            fit={fit}
                            measureKey={`${page}-${lineIndex}-${columnIndex}-${fragmentIndex}-${annotated ? "practice" : "scroll"}-${sourceKey}-${options.nekudot}-${options.trop}`}
                            wordCount={parsed.length}
                            experimentalWidths={experimentalWidths}
                            experimentalWidthTier={experimentalWidthTier}
                            variableWordSpacing={variableWordSpacing}
                            composerV2={composerV2}
                          >
                            {parsed.map((token, tokenIndex) => {
                              const id = tokenId(lineIndex, columnIndex, fragmentIndex, tokenIndex);
                              const pageToken = tokenLookup.get(id);
                              const phraseHighlight = annotated && phraseHighlighting ? phraseHighlights.get(id) : undefined;
                              const visible = annotated ? filterPracticeWord(token.display, options) : token.display;
                              const clickable = annotated && pageToken && (pageToken.marks.length > 0 || pageToken.qeri);
                              const title = pageToken
                                ? [pageToken.qeri ? `קרי: ${pageToken.qeri} · כתיב: ${pageToken.ketiv}` : "", pageToken.marks.map((mark) => mark.name).join(" · ")].filter(Boolean).join(" — ")
                                : "";
                              return (
                                <Fragment key={id}>
                                  {tokenIndex > 0 ? " " : null}
                                  <span
                                    className={[
                                      "line-token",
                                      boldMarks ? "bold-mark-token" : "",
                                      clickable ? "word inspectable-word" : "",
                                      token.qeri && annotated && qeriNotices ? "qeri-word" : "",
                                      selectedId === id ? "selected-token" : "",
                                      phraseHighlight ? `phrase-word phrase-${phraseHighlight.rank}` : "",
                                      phraseHighlight?.start ? "phrase-start" : "",
                                      phraseHighlight?.end ? "phrase-end" : "",
                                    ].filter(Boolean).join(" ")}
                                    onClick={clickable && pageToken ? () => onSelectToken(pageToken) : undefined}
                                    title={[title, phraseHighlight ? `${rankDetails[phraseHighlight.rank].label} phrase break` : ""].filter(Boolean).join(" — ") || undefined}
                                    data-ketiv={token.ketiv}
                                    data-qeri={token.qeri}
                                    data-phrase-rank={phraseHighlight?.rank}
                                  >
                                    {annotated
                                      ? visible
                                      : <SpecialWord text={visible} page={page} sourceLine={line.sourceLine} enabled={options.scribalMarks} />}
                                  </span>
                                </Fragment>
                              );
                            })}
                          </FittedFragment>
                        </Fragment>
                      );
                    });
                  return line.petucha || columnBreaks > 0
                    ? <SectionColumn breakCount={line.petucha ? 1 : columnBreaks} key={columnIndex} measureKey={columnKey} sectionType={line.petucha ? "petucha" : "setuma"} experimentalWidths={experimentalWidths} variableWordSpacing={variableWordSpacing} composerV2={composerV2}>{fragments}</SectionColumn>
                    : <span className="line-column" key={columnIndex}>{fragments}</span>;
                })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="folio">{page}</div>
    </article>
  );
}

export default function Home() {
  const [page, setPage] = useState(currentWeekParshaPage);
  const [pageState, setPageState] = useState<{ page: number; lines: DisplayLine[]; error: boolean }>({ page: 0, lines: blankLines(), error: false });
  const pageCache = useRef(new Map<number, DisplayLine[]>());
  const [manifest, setManifest] = useState<CorpusManifest | null>(null);
  const [nekudot, setNekudot] = useState(true);
  const [trop, setTrop] = useState(true);
  const [ranks, setRanks] = useState<Record<PrimaryRank, boolean>>({ emperor: true, king: true, duke: true, count: true, servant: true });
  const [scribalMarks, setScribalMarks] = useState(true);
  const [qeriNotices, setQeriNotices] = useState(true);
  const [experimentalWidths, setExperimentalWidths] = useState(true);
  const [experimentalWidthTier, setExperimentalWidthTier] = useState<ExperimentalWidthTier>(2);
  const [variableWordSpacing, setVariableWordSpacing] = useState(true);
  const [calibratedMeasure, setCalibratedMeasure] = useState(true);
  const [balancedPoetry, setBalancedPoetry] = useState(true);
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>("wide");
  const [showAliyot, setShowAliyot] = useState(true);
  const [boldMarks, setBoldMarks] = useState(true);
  const [phraseHighlighting, setPhraseHighlighting] = useState(false);
  const [dark, setDark] = useState(false);
  const [dimPaper, setDimPaper] = useState(false);
  const [klafPaper, setKlafPaper] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("combined");
  const [pageZoom, setPageZoom] = useState(100);
  const [doubleParshaSlug, setDoubleParshaSlug] = useState<string | null>(null);
  const [selected, setSelected] = useState<PageToken | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [readyLayoutKey, setReadyLayoutKey] = useState("");

  // Keep the server and first client render identical, then resolve a shared
  // URL before the browser paints. This avoids both a hydration warning and a
  // flash of the weekly parashah when opening a linked amud.
  useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPage = Number(params.get("amud"));
    let linkedPage: number | undefined;
    if (Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= MAX_PAGE) {
      linkedPage = requestedPage;
    } else {
      linkedPage = parshiot.find((item) => item.slug === params.get("parsha"))?.page;
    }
    if (linkedPage !== undefined) queueMicrotask(() => {
      setPage(linkedPage);
      if (params.get("double") === "1") {
        setDoubleParshaSlug(doubleParshaForSlug(activeParshaForPage(linkedPage).slug)?.slug ?? null);
      }
    });
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/data/corpus-manifest.json").then((response) => response.json()).then((corpus) => {
      if (!active) return;
      setManifest(corpus as CorpusManifest);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const cached = pageCache.current.get(page);
    if (cached) {
      setPageState({ page, lines: cached, error: false });
      return;
    }
    const controller = new AbortController();
    fetch(`/data/torah/${page}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Page unavailable");
        return response.json();
      })
      .then((data) => {
        const lines = normalizePageData(data, page);
        if (lines.length !== PHYSICAL_LINES) throw new Error(`Expected ${PHYSICAL_LINES} display rows, received ${lines.length}`);
        pageCache.current.set(page, lines);
        setPageState({ page, lines, error: false });
        for (const adjacent of [page - 1, page + 1].filter((number) => number >= 1 && number <= MAX_PAGE && !pageCache.current.has(number))) {
          fetch(`/data/torah/${adjacent}.json`).then((response) => response.ok ? response.json() : null).then((nextData) => {
            if (nextData) pageCache.current.set(adjacent, normalizePageData(nextData, adjacent));
          }).catch(() => undefined);
        }
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") setPageState({ page, lines: blankLines(), error: true });
      });
    return () => controller.abort();
  }, [page]);

  const lines = pageState.page === page ? pageState.lines : blankLines();
  const loading = pageState.page !== page;
  const activeParsha = activeParshaForPage(page);
  const availableDoubleParsha = doubleParshaForSlug(activeParsha.slug);
  const availableDoubleFirstParsha = availableDoubleParsha ? parshaForSlug(availableDoubleParsha.first) : undefined;
  const availableDoubleSecondParsha = availableDoubleParsha ? parshaForSlug(availableDoubleParsha.second) : undefined;
  const activeDoubleParsha = availableDoubleParsha?.slug === doubleParshaSlug ? availableDoubleParsha : undefined;
  const doubleFirstParsha = activeDoubleParsha ? availableDoubleFirstParsha : undefined;
  const doubleSecondParsha = activeDoubleParsha ? availableDoubleSecondParsha : undefined;
  const readingStartParsha = doubleFirstParsha ?? activeParsha;
  const readingEndParsha = doubleSecondParsha ?? activeParsha;
  const readingSlug = activeDoubleParsha?.slug ?? activeParsha.slug;
  const readingHebrew = activeDoubleParsha && doubleFirstParsha && doubleSecondParsha
    ? `${doubleFirstParsha.hebrew}־${doubleSecondParsha.hebrew}`
    : activeParsha.hebrew;
  const readingEnglish = activeDoubleParsha && doubleFirstParsha && doubleSecondParsha
    ? `${doubleFirstParsha.english}–${doubleSecondParsha.english}`
    : activeParsha.english;
  const readingVerses = activeDoubleParsha && doubleFirstParsha && doubleSecondParsha
    ? doubleFirstParsha.verses + doubleSecondParsha.verses
    : activeParsha.verses;
  const activeSefer = sefarim.find((item) => page >= item.start && page <= item.end) ?? sefarim[0];
  const navigateToPage = (nextPage: number) => {
    const nextDoubleParsha = doubleParshaForSlug(activeParshaForPage(nextPage).slug);
    if (doubleParshaSlug && nextDoubleParsha?.slug !== doubleParshaSlug) setDoubleParshaSlug(null);
    setPage(nextPage);
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("parsha", activeParsha.slug);
    params.set("amud", String(page));
    if (activeDoubleParsha) params.set("double", "1");
    else params.delete("double");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [activeDoubleParsha, activeParsha.slug, page]);
  const practiceTokens = useMemo(() => tokensForPage(lines, page), [lines, page]);
  const currentSelected = selected?.page === page ? selected : null;
  const composerV2 = experimentalWidths && calibratedMeasure;
  const layoutKey = [
    page,
    loading,
    nekudot,
    trop,
    scribalMarks,
    qeriNotices,
    experimentalWidths,
    experimentalWidthTier,
    variableWordSpacing,
    composerV2,
    balancedPoetry,
    phraseHighlighting,
    lineSpacing,
    pageZoom,
    viewMode,
    activeDoubleParsha?.slug,
  ].join("|");

  // Fitted letterforms and word gaps are applied after the DOM has measured
  // the current page. Keep the spread in place, but invisible, until that
  // pass completes so a page never flashes its uncomposed fallback layout.
  useEffect(() => {
    if (loading) return undefined;
    let active = true;
    let secondFrame = 0;
    const settle = () => {
      requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          if (active) setReadyLayoutKey(layoutKey);
        });
      });
    };
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(settle);
    return () => {
      active = false;
      cancelAnimationFrame(secondFrame);
    };
  }, [layoutKey, loading]);

  const markCounts = useMemo(() => {
    const counts = new Map<string, { meta: AccentMeta; count: number }>();
    const everyMark = [...Object.values(accentByCode).filter((meta) => !meta.note?.startsWith("Poetic-system")), silluqMeta, metegMeta];
    everyMark.forEach((meta) => counts.set(meta.key, { meta, count: 0 }));
    practiceTokens.forEach((token) => token.marks.forEach((meta) => {
      const current = counts.get(meta.key) ?? { meta, count: 0 };
      counts.set(meta.key, { meta, count: current.count + 1 });
    }));
    return [...counts.values()].sort((a, b) =>
      rankOrder.indexOf(a.meta.rank) - rankOrder.indexOf(b.meta.rank) || b.count - a.count || a.meta.name.localeCompare(b.meta.name),
    );
  }, [practiceTokens]);

  const groupCounts = useMemo(() => Object.fromEntries(rankOrder.map((rank) => [rank, markCounts.filter((item) => item.meta.rank === rank).reduce((sum, item) => sum + item.count, 0)])) as Record<AccentRank, number>, [markCounts]);
  const totalMarks = markCounts.reduce((sum, item) => sum + item.count, 0);
  const viewCopy = viewMode === "facing"
    ? { eyebrow: "FACING PAGES", title: "Practice beside the scroll" }
    : viewMode === "combined"
      ? { eyebrow: "COMBINED PAGE", title: "Scroll and practice on one sheet" }
    : viewMode === "practice"
      ? { eyebrow: "PRACTICE PAGE", title: "Pointed text for rehearsal" }
      : { eyebrow: "SCROLL PAGE", title: "The column as you’ll read it" };

  const spreadStyle = {
    width: `${pageZoom}%`,
    "--page-zoom-factor": (pageZoom / 100).toFixed(2),
    "--mobile-paper-width": `${(570 * pageZoom) / 100}px`,
    "--mobile-small-paper-width": `${(520 * pageZoom) / 100}px`,
  } as CSSProperties;

  const printPage = () => {
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(() => setTimeout(() => window.print(), 80));
  };

  const exportPdf = async (scope: "amud" | "parsha" = "amud") => {
    setExporting(true);
    setExportError("");
    const originalPage = page;
    let pagesToExport = [originalPage];
    try {
      await document.fonts?.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const readingEndIndex = parshiot.findIndex((item) => item.slug === readingEndParsha.slug);
      const parshaEnd = parshiot[readingEndIndex + 1]?.page ?? MAX_PAGE + 1;
      pagesToExport = scope === "parsha"
        ? Array.from({ length: Math.max(1, parshaEnd - readingStartParsha.page) }, (_, index) => readingStartParsha.page + index)
        : [originalPage];
      const waitForPage = (targetPage: number) => new Promise<void>((resolve, reject) => {
        const started = Date.now();
        const check = () => {
          const loadingSpread = document.querySelector(".spread.loading");
          const pageVisible = [...document.querySelectorAll<HTMLElement>(".paper-heading")].some((heading) => heading.textContent?.includes(`עמוד ${targetPage}`));
          if (!loadingSpread && pageVisible) { resolve(); return; }
          if (Date.now() - started > 15000) { reject(new Error(`Timed out loading amud ${targetPage}`)); return; }
          window.setTimeout(check, 50);
        };
        check();
      });
      let pdf: InstanceType<typeof jsPDF> | null = null;
      for (const targetPage of pagesToExport) {
        if (targetPage !== originalPage) {
          setPage(targetPage);
          await waitForPage(targetPage);
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        const exportNodes = viewMode === "combined"
          ? [...document.querySelectorAll<HTMLElement>(".combined-sheet")]
          : [...document.querySelectorAll<HTMLElement>(".paper")].filter((node) => getComputedStyle(node).display !== "none");
        if (!exportNodes.length) throw new Error("No visible page to export");
        for (const exportNode of exportNodes) {
          const bounds = exportNode.getBoundingClientRect();
          const pdfWidth = viewMode === "combined" ? 14 : 7;
          const pdfHeight = Number((pdfWidth * bounds.height / bounds.width).toFixed(3));
          const pageFormat: [number, number] = [pdfWidth, pdfHeight];
          const orientation = pdfWidth > pdfHeight ? "landscape" : "portrait";
          const image = await toPng(exportNode, { pixelRatio: 2.5, backgroundColor: "#fdfbf5", cacheBust: true });
          if (!pdf) {
            pdf = new jsPDF({ orientation, unit: "in", format: pageFormat, compress: true });
            pdf.setProperties({
              title: scope === "parsha" ? `${readingEnglish} — complete parsha` : `${readingEnglish} — amud ${originalPage}`,
              subject: `Tikkun Koreh · ${manifest?.edition ?? "pinned 245-column corpus"} · ${manifest?.pinnedOn ?? "2026-08-13"}`,
              author: "Tikkun Koreh",
              creator: "Tikkun Koreh PDF export",
            });
          } else pdf.addPage(pageFormat, orientation);
          pdf.addImage(image, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
        }
      }
      if (!pdf) throw new Error("No pages to export");
      const name = scope === "parsha" ? `tikkun-${readingSlug}-complete-parsha.pdf` : `tikkun-${readingSlug}-amud-${originalPage}.pdf`;
      pdf.save(name);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "PDF export failed");
    } finally {
      if (scope === "parsha" && pagesToExport.length > 1) setPage(originalPage);
      setExporting(false);
    }
  };

  const sharedPageProps = {
    aliyahMode: activeDoubleParsha ? "double" as const : "standard" as const,
    doubleParshaStarts: activeDoubleParsha && doubleFirstParsha && doubleSecondParsha ? [
      { page: doubleFirstParsha.page, line: doubleFirstParsha.line, aliyah: 1 },
      ...(activeDoubleParsha.secondStartAliyah ? [{ page: doubleSecondParsha.page, line: doubleSecondParsha.line, aliyah: activeDoubleParsha.secondStartAliyah }] : []),
    ] : undefined,
    pageParshaOverride: activeDoubleParsha ? { hebrew: readingHebrew, english: readingEnglish } : undefined,
  };
  const scrollPage = <TikkunPage {...sharedPageProps} lines={lines} page={page} options={{ nekudot, trop, ranks, scribalMarks }} qeriNotices={false} experimentalWidths={experimentalWidths} experimentalWidthTier={experimentalWidthTier} variableWordSpacing={variableWordSpacing} composerV2={composerV2} balancedPoetry={balancedPoetry} lineSpacing={lineSpacing} showAliyot={false} boldMarks={boldMarks} phraseHighlighting={false} selectedId={null} practiceTokens={practiceTokens} onSelectToken={() => undefined} />;
  const practicePage = <TikkunPage {...sharedPageProps} annotated lines={lines} page={page} options={{ nekudot, trop, ranks, scribalMarks }} qeriNotices={qeriNotices} experimentalWidths={experimentalWidths} experimentalWidthTier={experimentalWidthTier} variableWordSpacing={variableWordSpacing} composerV2={composerV2} balancedPoetry={balancedPoetry} lineSpacing={lineSpacing} showAliyot={showAliyot} boldMarks={boldMarks} phraseHighlighting={phraseHighlighting} selectedId={currentSelected?.id ?? null} practiceTokens={practiceTokens} onSelectToken={setSelected} />;

  return (
    <main className={`app-shell ${dark ? "theme-dark" : ""} ${dimPaper ? "dim-paper" : ""} ${klafPaper ? "klaf-paper" : ""} ${exporting ? "exporting-pdf" : ""} view-${viewMode}`}>
      <header className="topbar">
        <div className="brand"><div className="brand-mark">ת</div><div><div className="brand-name">Tikkun</div><div className="brand-sub">A fixed-column tikkun for careful preparation</div></div></div>
        <nav className="top-actions" aria-label="Document actions">
          <button className="icon-button" aria-label="Toggle dark mode" aria-pressed={dark} onClick={() => setDark(!dark)}>{dark ? "☀" : "☾"}</button>
          <div className="view-menu"><label htmlFor="view-mode" className="sr-only">Page view</label><select id="view-mode" value={viewMode} onChange={(event) => setViewMode(event.target.value as ViewMode)}><option value="facing">Both pages</option><option value="combined">Combined page</option><option value="practice">Practice page</option><option value="scroll">Scroll page</option></select></div>
          <button className="ghost-button" onClick={printPage}>Print</button>
          <button className="primary-button" disabled={exporting || loading} onClick={() => exportPdf("parsha")}>{exporting ? "Making PDF…" : "Download PDF"}</button>
        </nav>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="eyebrow">CURRENT READING</div>
          <h1>{readingHebrew}</h1>
          <p className="reading-ref">{readingEnglish} · {activeSefer.english} · Amud {page} of {MAX_PAGE}</p>
          <div className="parsha-stats" aria-label={`${readingEnglish} length`}><span><b>{readingVerses}</b><small>pesukim</small></span><span><b>≈ {approximateParshaColumns(readingStartParsha.slug, Boolean(activeDoubleParsha))}</b><small>columns</small></span></div>

          <div className="field-group">
            <label htmlFor="parsha">Parashah</label>
            <select id="parsha" className="select-button parsha-select" value={activeParsha.slug} onChange={(event) => { const next = parshiot.find((item) => item.slug === event.target.value); if (next) { setDoubleParshaSlug(null); setPage(next.page); } }}>
              {sefarim.map((book, index) => <optgroup label={`${book.name} · ${book.english}`} key={book.name}>{parshiot.filter((item) => item.book === index + 1).map((item) => <option value={item.slug} key={item.slug}>{item.hebrew} · {item.english}</option>)}</optgroup>)}
            </select>
            <label htmlFor="sefer">Sefer</label>
            <select id="sefer" className="select-button" value={activeSefer.start} onChange={(event) => { setDoubleParshaSlug(null); setPage(Number(event.target.value)); }}>{sefarim.map((book) => <option value={book.start} key={book.name}>{book.name} · {book.english}</option>)}</select>
            <label htmlFor="page">Amud</label>
            <div className="page-input-wrap"><input id="page" type="number" min="1" max={MAX_PAGE} value={page} onChange={(event) => navigateToPage(Math.min(MAX_PAGE, Math.max(1, Number(event.target.value) || 1)))} /><span>/ {MAX_PAGE}</span></div>
          </div>

          <details className="preferences-panel">
            <summary><span><b>Preferences</b><small>Practice layers, spacing, and paper</small></span><span className="preferences-chevron" aria-hidden="true">⌄</span></summary>
            <div className="preferences-content">
              <div className="eyebrow">PRACTICE LAYERS</div>
          <div className="toggle-row"><span><b>נְקֻדּוֹת</b><small>Vowel points only</small></span><Toggle checked={nekudot} label="Show vowel points" onChange={() => setNekudot(!nekudot)} /></div>
          <div className="toggle-row"><span><b>טְעָמִים</b><small>Cantillation marks</small></span><Toggle checked={trop} label="Show cantillation" onChange={() => setTrop(!trop)} /></div>
          <div className="toggle-row"><span><b>פִּסּוּק הַטְּעָמִים</b><small>Color phrases by the strength of their closing disjunctive</small></span><Toggle checked={phraseHighlighting} label="Show cantillation phrase highlighting" onChange={() => setPhraseHighlighting(!phraseHighlighting)} /></div>
          {phraseHighlighting && <div className="phrase-legend" aria-label="Cantillation phrase color key"><span className="phrase-legend-emperor"><i />Verse / midpoint</span><span className="phrase-legend-king"><i />Major</span><span className="phrase-legend-duke"><i />Secondary</span><span className="phrase-legend-count"><i />Lesser</span><small>Conjunctive servants stay with the disjunctive phrase they lead into.</small></div>}
          <div className="toggle-row prototype-row"><span><b>הַדְגָּשַׁת נְקֻדּוֹת וּטְעָמִים <em className="beta-badge">BETA</em></b><small>Heavier marks for easier reading</small></span><Toggle checked={boldMarks} label="Bold trop and nekudot" onChange={() => setBoldMarks(!boldMarks)} /></div>
          <label className="prototype-strength line-spacing-control"><span>Line spacing</span><select aria-label="Line spacing" value={lineSpacing} onChange={(event) => setLineSpacing(event.target.value as LineSpacing)}><option value="standard">Standard</option><option value="relaxed">Relaxed</option><option value="wide">Wide</option><option value="extra-wide">Extra wide</option></select><small>More vertical room makes trop and nekudot easier to distinguish.</small></label>
          <div className="rank-controls">
            {primaryRanks.map((rank) => <div className="group-row" key={rank}><span className={`group-icon rank-${rank}`}>{rankDetails[rank].icon}</span><span><b>{rankDetails[rank].hebrew}</b><small>{rankDetails[rank].label} · {groupCounts[rank]}</small></span><Toggle checked={ranks[rank]} disabled={!trop} label={`Show ${rankDetails[rank].label}`} onChange={() => setRanks({ ...ranks, [rank]: !ranks[rank] })} /></div>)}
          </div>
          <div className="toggle-row"><span><b>סִימָנֵי סוֹפְרִים</b><small>Dots, inverted nuns & special letters</small></span><Toggle checked={scribalMarks} label="Show scribal marks and special letters" onChange={() => setScribalMarks(!scribalMarks)} /></div>
          <div className="toggle-row prototype-row"><span><b>עֲלִיּוֹת <em className="beta-badge">BETA</em></b><small>Mark aliyah starts in the practice margin</small></span><Toggle checked={showAliyot} label="Show aliyah markers" onChange={() => setShowAliyot(!showAliyot)} /></div>
          <div className="toggle-row"><span><b>קְרֵי / כְּתִיב</b><small>Notice and reveal both forms</small></span><Toggle checked={qeriNotices} label="Show qeri and ketiv notices" onChange={() => setQeriNotices(!qeriNotices)} /></div>
          <div className="toggle-row prototype-row"><span><b>כְּתִיבַת סוֹפֵר</b><small>Balanced letterforms and word gaps</small></span><Toggle checked={experimentalWidths} label="Use scribal composition" onChange={() => setExperimentalWidths(!experimentalWidths)} /></div>
          {experimentalWidths && <div className="prototype-spacing"><span><b>Composer v2</b><small>Calibrated 25.5em column with restrained line scaling.</small></span><Toggle checked={calibratedMeasure} label="Use calibrated Composer v2 column" onChange={() => setCalibratedMeasure(!calibratedMeasure)} /></div>}
          {experimentalWidths && <label className="prototype-strength"><span>Maximum extension</span><select aria-label="Maximum experimental letter extension" value={experimentalWidthTier} onChange={(event) => setExperimentalWidthTier(Number(event.target.value) as ExperimentalWidthTier)}><option value={1}>Gentle ל</option><option value={2}>Long ל</option><option value={3}>Very long ל</option></select><small>The fitter uses the mildest form that completes each line.</small></label>}
          {experimentalWidths && <div className="prototype-spacing"><span><b>Variable word spacing</b><small>Widens and tightens individual gaps on ordinary and section lines.</small></span><Toggle checked={variableWordSpacing} label="Use variable spacing between words" onChange={() => setVariableWordSpacing(!variableWordSpacing)} /></div>}
          <div className="prototype-spacing"><span><b>Precision line balancing <em className="beta-badge">BETA</em></b><small>Stabilizes exceptional ordinary lines, Shirat Hayam brickwork, and Ha’azinu edges.</small></span><Toggle checked={balancedPoetry} label="Use precision line balancing" onChange={() => setBalancedPoetry(!balancedPoetry)} /></div>
          <div className="toggle-row"><span><b>קְלָף</b><small>Warm parchment-like paper</small></span><Toggle checked={klafPaper} label="Use klaf paper color" onChange={() => setKlafPaper(!klafPaper)} /></div>
              <div className="toggle-row"><span><b>עַמּוּד כֵּהֶה</b><small>Dim paper for rehearsal</small></span><Toggle checked={dimPaper} label="Dim the paper" onChange={() => setDimPaper(!dimPaper)} /></div>
            </div>
          </details>

        </aside>

        <section className="reader">
          <div className="reader-heading">
            <div><span className="eyebrow">{viewCopy.eyebrow}</span><h2>{viewCopy.title}</h2></div>
            <div className="reader-controls">
              <div className="zoom-control" role="group" aria-label="Reading zoom"><button aria-label="Zoom out" disabled={pageZoom === MIN_ZOOM} onClick={() => setPageZoom(Math.max(MIN_ZOOM, pageZoom - ZOOM_STEP))}>−</button><button className="zoom-value" aria-label={`Reset zoom, currently ${pageZoom}%`} onClick={() => setPageZoom(100)}>{pageZoom}%</button><button aria-label="Zoom in" disabled={pageZoom === MAX_ZOOM} onClick={() => setPageZoom(Math.min(MAX_ZOOM, pageZoom + ZOOM_STEP))}>+</button></div>
              {availableDoubleParsha && availableDoubleFirstParsha && availableDoubleSecondParsha ? <div className="double-parsha-control"><span><b>Double parsha</b><small>{availableDoubleFirstParsha.english}–{availableDoubleSecondParsha.english}</small></span><Toggle checked={Boolean(activeDoubleParsha)} label={`Use ${availableDoubleFirstParsha.english}–${availableDoubleSecondParsha.english} double-parsha aliyot`} onChange={() => {
                if (activeDoubleParsha) setDoubleParshaSlug(null);
                else {
                  setDoubleParshaSlug(availableDoubleParsha.slug);
                  setPage(availableDoubleFirstParsha.page);
                }
              }} /></div> : null}
              <div className="page-stepper" dir="ltr"><button aria-label="Next amud" disabled={page === MAX_PAGE} onClick={() => navigateToPage(page + 1)}>‹</button><span>{loading ? "Loading…" : `${page} / ${MAX_PAGE}`}</span><button aria-label="Previous amud" disabled={page === 1} onClick={() => navigateToPage(page - 1)}>›</button></div>
            </div>
          </div>

          {pageState.page === page && pageState.error && <div className="load-error">This locally pinned amud could not be loaded. Reload the page and try again.</div>}
          {exportError && <div className="load-error" role="alert">PDF export failed: {exportError}. Printing still works.</div>}
          <div className="spread-viewport"><div className={`spread line-spacing-${lineSpacing} ${loading ? "loading" : ""} ${readyLayoutKey !== layoutKey ? "layout-pending" : ""}`} aria-busy={readyLayoutKey !== layoutKey} style={spreadStyle}>
            {viewMode === "combined" ? <div className="combined-sheet">{scrollPage}{practicePage}</div> : <>{scrollPage}{practicePage}</>}
          </div></div>

          <section className="analysis-section" aria-labelledby="analysis-title">
            <div className="analysis-title-row"><div><span className="eyebrow">CANTILLATION GUIDE</span><h2 id="analysis-title">Review the marks on this amud</h2></div><p>Click a marked word, or focus the practice page and use the arrow keys.</p></div>
            <div className="analysis-grid">
              <article className="inspector-card"><span className="card-kicker">WORD INSPECTOR</span>{currentSelected ? <><div className="selected-word" dir="rtl">{currentSelected.word}</div>{currentSelected.qeri && <div className="qeri-detail"><span><small>קרי · read</small><b dir="rtl">{currentSelected.qeri}</b></span><span><small>כתיב · written</small><b dir="rtl">{currentSelected.ketiv}</b></span></div>}<div className="mark-list">{currentSelected.marks.map((mark, index) => <div className="mark-row" key={`${mark.key}-${index}`}><span className={`rank-dot rank-${mark.rank}`} /><span><b>{mark.hebrew}</b><small>{mark.name} · {rankDetails[mark.rank].label}{mark.note ? ` · ${mark.note}` : ""}</small></span><span className="rank-tag">{mark.rank}</span></div>)}</div></> : <div className="empty-inspector"><span>אֶתְנַחְתָּא</span><p>Select a word to see its accents, hierarchy, and qeri/ketiv details.</p></div>}</article>

              <article className="mark-summary-card"><div className="card-header"><span className="card-kicker">THIS AMUD</span><b>{totalMarks} marks</b></div><div className="bars">{markCounts.filter((item) => item.count > 0 && primaryRanks.includes(item.meta.rank as PrimaryRank)).sort((a, b) => b.count - a.count).slice(0, 5).map((item, _index, visible) => <div className="bar-row" key={item.meta.key}><span>{item.meta.hebrew}</span><i><em style={{ width: `${Math.max(8, (item.count / (visible[0]?.count || 1)) * 100)}%` }} /></i><b>{item.count}</b></div>)}</div><p className="card-note">Silluq is distinguished contextually from meteg; punctuation is counted separately.</p></article>
            </div>

            <section className="trop-inventory" aria-labelledby="trop-inventory-title">
              <div className="trop-inventory-heading"><div><span className="card-kicker">COMPLETE INVENTORY</span><h3 id="trop-inventory-title">All marks on this amud</h3></div><div className="inventory-summary"><small>Hierarchy, then count</small><b>{totalMarks} total marks</b></div></div>
              <div className="trop-count-groups">{rankOrder.map((rank) => <div className="trop-count-group" key={rank}><div className="trop-count-group-heading"><span className={`group-icon rank-${rank}`}>{rankDetails[rank].icon}</span><span><b>{rankDetails[rank].label}</b><small>{groupCounts[rank]} marks · {rankDetails[rank].description}</small></span></div><div className="trop-count-list">{markCounts.filter((item) => item.meta.rank === rank).sort((a, b) => b.count - a.count || a.meta.name.localeCompare(b.meta.name)).map((item) => <div className={`trop-count-row ${item.count === 0 ? "zero" : ""}`} key={item.meta.key}><span dir="rtl"><b>{item.meta.hebrew}</b><small>{item.meta.name}</small></span><strong>{item.count}</strong></div>)}</div></div>)}</div>
            </section>

            <p className="analysis-source">{manifest ? `${manifest.edition} · pinned ${manifest.pinnedOn} · ${manifest.sourceRows.toLocaleString()} source rows preserved as ${manifest.physicalRowsAfterNormalization.toLocaleString()} display rows · ${manifest.qeriKetiv} qeri/ketiv pairs · ${manifest.puncta} extraordinary dots · ${manifest.invertedNuns} inverted nuns.` : "Loading corpus provenance…"} Counts are computed directly from the currently displayed amud.</p>
          </section>
        </section>
      </div>
    </main>
  );
}
