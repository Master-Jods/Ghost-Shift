import { useState, useEffect } from 'react';
import { art, sprite, type PokemonRecord } from './data';
import { titleCase } from './content';
export function MonImage({ id, className = '' }: {
    id: number;
    className?: string;
}) { const [stage, setStage] = useState(0); useEffect(() => setStage(0), [id]); return stage < 2 ? <img className={className} src={stage === 0 ? art(id) : sprite(id)} alt={`Pokémon ${id}`} onError={() => setStage(s => s + 1)}/> : <div className={`mon-fallback ${className}`} role="img" aria-label={`Pokémon ${id} artwork unavailable`}><span>◉</span><small>#{id}</small></div>; }
const cache = new Map<number, PokemonRecord>();
export function PokemonPicker({ selected, onChange, limit = 3 }: {
    selected: number[];
    onChange: (ids: number[]) => void;
    limit?: number;
}) {
    const [replaceSlot, setReplaceSlot] = useState<number | null>(null);
    const [index, setIndex] = useState<{
        id: number;
        name: string;
    }[]>([]), [query, setQuery] = useState(''), [page, setPage] = useState(0), [error, setError] = useState(''), [loading, setLoading] = useState(true), [detail, setDetail] = useState<PokemonRecord | null>(null), [records, setRecords] = useState<Record<number, PokemonRecord>>({}), [preview, setPreview] = useState<number | null>(null);
    async function load() { setLoading(true); setError(''); try {
        const r = await fetch('/api/catalog', { cache: 'no-store' });
        if (!r.ok)
            throw Error('Catalog host is unavailable.');
        const data = await r.json();
        if (data.entries.length !== data.count)
            throw Error('Catalog response is incomplete. Retry.');
        setIndex(data.entries);
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setLoading(false);
    } }
    useEffect(() => { void load(); }, []);
    useEffect(() => setPage(0), [query]);
    const q=query.trim().toLowerCase(),matches=index.filter(p=>!q||(/^\d+$/.test(q)?String(p.id)===q:p.name.includes(q))),visible=matches.slice(page*12,page*12+12);
    useEffect(() => { let active = true; let next = 0; const ids = [...new Set([...visible.map(p => p.id), ...selected])]; async function worker() { while (next < ids.length && active) {
        const id = ids[next++];
        try {
            let record = cache.get(id);
            if (!record) {
                const response = await fetch('/api/pokemon/' + id);
                if (!response.ok)
                    continue;
                record = (await response.json()).record;
                cache.set(id, record!);
            }
            if (active)
                setRecords(old => ({ ...old, [id]: record! }));
        }
        catch { /* Catalog entries stay selectable when detail metadata is unavailable. */ }
    } } void Promise.all([worker(), worker(), worker()]); return () => { active = false; }; }, [index, page, query, JSON.stringify(selected)]);
    function choose(id: number) { if (selected.includes(id))
        onChange(selected.filter(v => v !== id));
    else if (limit === 1)
        onChange([id]);
    else if (selected.length < limit)
        onChange([...selected, id]);
    else if (replaceSlot !== null) {
        onChange(selected.map((v, i) => i === replaceSlot ? id : v));
        setReplaceSlot(null);
    } }
    return <div className="pokemon-picker"><div className="team-slots">{Array.from({ length: limit }, (_, i) => <div key={i} className={replaceSlot === i ? 'replacing' : ''}>{selected[i] ? <><MonImage id={selected[i]}/><b>{titleCase(index.find(p => p.id === selected[i])?.name || String(selected[i]))}</b><button className="slot-remove" aria-label={`Remove team slot ${i + 1}`} onClick={() => choose(selected[i])}>×</button><button className="slot-replace" aria-label={`Replace team slot ${i + 1}`} onClick={() => setReplaceSlot(replaceSlot === i ? null : i)}>{replaceSlot === i ? 'Choose replacement' : 'Replace'}</button></> : <><span className="empty-slot">＋</span><small>SLOT {i + 1}</small></>}</div>)}</div><label className="search-label">Search complete PokéAPI catalog<input aria-label="Search Pokémon by name or ID" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, Pokédex ID, or alternate form…"/></label><div className="catalog-status">{loading ? 'Loading complete index…' : `${matches.length} matching entries / ${index.length} catalog entries · page ${page + 1} of ${Math.max(1, Math.ceil(matches.length / 12))}`}</div>{error && <div role="alert">{error}<button onClick={load}>Retry catalog</button></div>}{!loading && !error && matches.length === 0 && <p>No matching entry. Search another name or numeric ID.</p>}<div className="catalog-grid">{visible.map(p => <article key={p.id} className={selected.includes(p.id) ? 'selected' : ''}><MonImage id={p.id}/><small>#{p.id} · {records[p.id] ? (records[p.id].isDefault ? 'Default variety' : 'Alternate variety/form') : p.id >= 10000 ? 'Alternate entry' : 'Pokémon entry'}</small><b>{titleCase(p.name)}</b><div className="type-badges">{records[p.id]?.types.length ? records[p.id].types.map(t => <span key={t}>{t}</span>) : <span>{records[p.id] ? 'Metadata offline · neutral rules' : 'Loading types…'}</span>}</div><div><button disabled={!selected.includes(p.id) && selected.length >= limit && limit !== 1 && replaceSlot === null} onClick={() => choose(p.id)}>{selected.includes(p.id) ? 'Remove' : replaceSlot !== null && selected.length >= limit ? 'Replace slot ' + (replaceSlot + 1) : 'Select'}</button><button onClick={() => { setPreview(p.id); setDetail(records[p.id] || null); }}>Details</button></div></article>)}</div><div className="pager"><button disabled={page === 0} onClick={() => setPage(v => v - 1)}>Previous</button><span>{matches.length} results</span><button disabled={(page + 1) * 12 >= matches.length} onClick={() => setPage(v => v + 1)}>Next</button></div>{preview && <div className="detail-card"><button aria-label="Close Pokémon details" onClick={() => setPreview(null)}>×</button><MonImage id={preview}/><h3>{titleCase(index.find(p => p.id === preview)?.name || String(preview))}</h3><p>#{preview} · {(records[preview] || detail)?.species || 'Species metadata unavailable'}</p><p>{(records[preview] || detail)?.types.join(' / ') || 'Types unavailable offline'}</p><p>{(records[preview] || detail)?.stats.length ? `Official base stats: ${(records[preview] || detail)!.stats.join(' / ')}` : 'Custom gameplay uses a neutral modifier while official metadata is unavailable.'}</p><p>Every selected Pokémon can Assist, Scout, Guard, Battle and Contain. Custom normalized modifiers are bounded to 0.85–1.15; missing artwork never excludes this entry.</p></div>}</div>;
}
