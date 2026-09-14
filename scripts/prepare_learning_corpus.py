"""Build offline, reflowable passages from the unchanged pinned Torah snapshot.

Blocks end at sof pasuq. They deliberately have no verse numbers: the source
contains more sof-pasuq marks than verse references (including special readings).
Do not infer chapter/verse labels from block indexes.
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'SourceData'

def flatten(value):
    if isinstance(value, str):
        return [value]
    return [s for child in value for s in flatten(child)] if isinstance(value, list) else []

def words(text):
    pairs = []
    def replace(match):
        pairs.append((match[1], re.sub(r'־\s+', '־', match[2].strip())))
        return f'\ue000{len(pairs)-1}\ue001' + (' ' if match[2][-1].isspace() else '')
    text = text.replace('#(פ)', '').replace('(׆)#', '׆ ').replace('#(׆)', ' ׆')
    text = re.sub(r'([^\s־#]+)#\[([^\]]+)\]', replace, text)
    for token in text.split():
        matches = list(re.finditer(r'\ue000(\d+)\ue001', token))
        assert len(matches) <= 1, 'Multiple qeri pairs in one token need explicit handling'
        read = re.sub(r'\ue000(\d+)\ue001', lambda m: pairs[int(m[1])][1], token)
        assert not any(c in read for c in '#[]\ue000\ue001'), read
        word = {'text': read}
        if matches:
            word['ketiv'], word['qeri'] = pairs[int(matches[0][1])]
        yield word

def generate():
    manifest = json.loads((SOURCE / 'corpus-manifest.json').read_text())
    rows = []
    positions = {}
    for page in range(1, 246):
        raw = (SOURCE / f'torah/{page}.json').read_bytes()
        assert hashlib.sha256(raw).hexdigest() == manifest['checksums'][f'{page}.json']
        for line, row in enumerate(json.loads(raw), 1):
            positions[(page, line)] = len(rows)
            rows.append((page, row))
    catalog = (SOURCE / 'catalog.ts').read_text().split('export const parshiot: Parsha[] = [')[1].split('];')[0]
    pattern = r'slug: "([^"]+)", hebrew: "([^"]+)", english: "([^"]+)", book: (\d+), page: (\d+), line: (\d+), verses: (\d+)'
    entries = list(re.finditer(pattern, catalog))
    assert len(entries) == 54
    # Compose the entire corpus first: a parsha can start partway through a
    # printed row, and a verse can continue across an amud boundary.
    all_blocks, pending = [], []
    start_row = 0
    for row_index, (source_page, row) in enumerate(rows):
        for word in words(' '.join(flatten(row['text']))):
            if not pending:
                start_row = row_index
                start_page = source_page
            pending.append(word)
            if '׃' in word['text']:
                all_blocks.append({'row': start_row, 'amud': start_page, 'words': pending})
                pending = []
    assert not pending, 'Unterminated final passage'
    boundaries = [next(i for i, block in enumerate(all_blocks)
                       if block['row'] >= positions[(int(m[5]), int(m[6]))]) for m in entries]
    passages = []
    for index, match in enumerate(entries):
        slug, hebrew, english, book, page, line, _ = match.groups()
        end = boundaries[index + 1] if index + 1 < len(entries) else len(all_blocks)
        blocks = [{'id': f'{slug}-{i}', 'amud': b['amud'], 'words': b['words']}
                  for i, b in enumerate(all_blocks[boundaries[index]:end])]
        assert blocks
        passages.append({'id': slug, 'hebrew': hebrew, 'name': english, 'book': int(book), 'blocks': blocks})
    actual_pairs = sum('qeri' in w for p in passages for b in p['blocks'] for w in b['words'])
    assert actual_pairs == manifest['qeriKetiv'], (actual_pairs, manifest['qeriKetiv'])
    output = ROOT / 'Tikkun/Resources/learning-corpus.json'
    output.write_text(json.dumps(passages, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'Validated 245 source checksums; generated {len(passages)} parshiot, {sum(len(p["blocks"]) for p in passages)} reading blocks, {actual_pairs} qeri/ketiv pairs.')

if __name__ == '__main__':
    generate()
