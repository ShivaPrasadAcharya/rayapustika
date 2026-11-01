/* rayapustika2 catalogue. All file names and remarks are rendered as text. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const folders = [
    {key:'all', label:'All files', icon:'folder'},
    {key:'pdf', label:'PDFs', icon:'file'},
    {key:'images', label:'Images', icon:'image'},
    {key:'docs', label:'Documents', icon:'file'},
    {key:'spreadsheet', label:'Spreadsheets', icon:'grid'},
    {key:'powerpoints', label:'PowerPoints', icon:'slides'}
  ];
  const folderKeys = new Set(folders.slice(1).map(f => f.key));
  const data = window.RAYA_INDEX || {files:[], generatedAt:null};
  const clean = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
  // Nepali character mappings supplied for optional, space-insensitive search.
  const NepaliNormalizer = {
    vowelMap: {'ी':'ि', 'ू':'ु', 'ृ':'ि', 'ऋ':'रि'},
    sibilantMap: {'श':'स', 'ष':'स'},
    nasalMap: {'ङ':'न', 'ण':'न', 'ञ':'न', 'ं':'न्'},
    vaBaMap: {'व':'ब'},
    numberMap: {'०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9'},
    _isDropped(ch, ignoreSpaces) {
      if (ch === '\u200D' || ch === '\u200C') return true;
      if (ignoreSpaces && /\s/.test(ch)) return true;
      return false;
    },
    _transformChar(ch) {
      let s = ch;
      for (const [f,t] of Object.entries(this.vowelMap)) if (s === f) s = t;
      for (const [f,t] of Object.entries(this.sibilantMap)) if (s === f) s = t;
      for (const [f,t] of Object.entries(this.nasalMap)) if (s === f) s = t;
      for (const [f,t] of Object.entries(this.vaBaMap)) if (s === f) s = t;
      for (const [f,t] of Object.entries(this.numberMap)) if (s === f) s = t;
      return s;
    },
    normalize(text, opts = {}) {
      if (!text) return '';
      return this._normalizeWithMap(text, opts).text;
    },
    _normalizeWithMap(text, opts = {}) {
      const ignoreSpaces = !!opts.ignoreSpaces;
      const src = text.normalize('NFC');
      let out = '';
      const indexMap = [];
      for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (this._isDropped(ch, ignoreSpaces)) continue;
        const mapped = this._transformChar(ch);
        for (const outCh of mapped) {out += outCh; indexMap.push(i);}
      }
      return {text:out, indexMap};
    },
    isDevanagari(text) {return /[\u0900-\u097F]/.test(text);},
    mapToOriginal(normPos, original, normalized, opts = {}) {
      const {indexMap} = this._normalizeWithMap(original, opts);
      if (normPos <= 0) return 0;
      if (normPos >= indexMap.length) return original.length;
      return indexMap[normPos];
    },
    search(query, text) {
      if (!query || !text) return [];
      const normQuery = this._normalizeWithMap(query, {ignoreSpaces:true}).text;
      const {text:normText, indexMap} = this._normalizeWithMap(text, {ignoreSpaces:true});
      if (!normQuery) return [];
      const matches = [];
      let fromIndex = 0;
      while (fromIndex <= normText.length) {
        const idx = normText.indexOf(normQuery, fromIndex);
        if (idx === -1) break;
        const startOrig = indexMap[idx];
        const endOrig = indexMap[idx + normQuery.length - 1] + 1;
        matches.push({start:startOrig, end:endOrig});
        fromIndex = idx + 1;
      }
      return matches;
    },
    matches(query, text) {return this.search(query, text).length > 0;}
  };
  const collator = new Intl.Collator(undefined, {numeric:true, sensitivity:'base'});
  const files = (Array.isArray(data.files) ? data.files : []).filter(f => {
    if (!f || typeof f.path !== 'string' || !f.path.startsWith('Files/')) return false;
    const segments = f.path.split('/');
    return segments.length >= 3 && folderKeys.has(segments[1]) && !segments.some(s => !s || s === '.' || s === '..' || /[\\\u0000-\u001f]/.test(s));
  }).map(f => ({...f, folder:f.path.split('/')[1], name:String(f.name || f.path.split('/').pop()), remarks:String(f.remarks || ''), extension:String(f.extension || f.path.split('.').pop()).toLocaleLowerCase()}));
  const state = {folder:'all', page:1, filtered:[]};
  const advancedIds = ['match-mode','search-field','extension','name-filter','remarks-filter','exclude-filter','has-remarks'];
  const defaults = {'match-mode':'all','search-field':'all','extension':'','name-filter':'','remarks-filter':'','exclude-filter':'','has-remarks':false};
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('aria-hidden','true');
    const use = document.createElementNS('http://www.w3.org/2000/svg','use');
    use.setAttribute('href',`#i-${name}`); svg.append(use); return svg;
  }
  function element(tag, className, text) {
    const e = document.createElement(tag); if (className) e.className = className;
    if (text !== undefined) e.textContent = text; return e;
  }
  function encodedPath(path) { return path.split('/').map(encodeURIComponent).join('/'); }
  function tokens(value) { return (clean(value).match(/"[^"]+"|[^\s,]+/g) || []).map(t => t.replace(/^"|"$/g,'')); }
  function advancedCount() {return advancedIds.filter(id => ($(id).type === 'checkbox' ? $(id).checked : $(id).value) !== defaults[id]).length;}
  function fileUrl(file) {return new URL(encodedPath(file.path), document.baseURI).href;}
  function bytes(n) { if (!Number.isFinite(n)) return ''; if (n < 1024) return `${n} B`; if (n < 1048576) return `${(n/1024).toFixed(1)} KB`; return `${(n/1048576).toFixed(1)} MB`; }
  function folderNavigation() {
    const nav = $('folders'); nav.replaceChildren();
    for (const folder of folders) {
      const count = folder.key === 'all' ? files.length : files.filter(f => f.folder === folder.key).length;
      const b = element('button',`folder-button${folder.key===state.folder?' active':''}`);
      b.type = 'button'; b.setAttribute('aria-pressed', String(folder.key===state.folder));
      b.append(icon(folder.icon), element('span','',folder.label), element('span','folder-count',String(count)));
      b.addEventListener('click', () => {state.folder=folder.key; state.page=1; folderNavigation(); render();});
      nav.append(b);
    }
  }
  const standardExtensions = ['pdf','jpg','jpeg','png','webp','gif','svg','doc','docx','odt','rtf','txt','md','xls','xlsx','ods','csv','tsv','ppt','pptx','odp'];
  const extensions = [...new Set([...standardExtensions, ...files.map(f=>f.extension)])].sort();
  for (const ext of extensions) {$('extension').append(new Option(ext.toUpperCase(), ext));}
  function getFiltered() {
    const normalized = $('nepali-normalized')?.checked ?? true;
    const searchText = value => normalized ? NepaliNormalizer.normalize(clean(value), {ignoreSpaces:true}) : clean(value);
    // Split words before removing spaces so All words and Any word keep their meaning.
    const query = searchText($('search').value), queryTokens = tokens($('search').value).map(searchText).filter(Boolean), mode = $('match-mode').value;
    const field = $('search-field').value, ext = $('extension').value;
    const name = searchText($('name-filter').value), remarks = searchText($('remarks-filter').value), excluded = tokens($('exclude-filter').value).map(searchText).filter(Boolean);
    const result = files.filter(file => {
      if (state.folder !== 'all' && file.folder !== state.folder) return false;
      if (ext && file.extension !== ext) return false;
      if (name && !searchText(file.name).includes(name)) return false;
      if (remarks && !searchText(file.remarks).includes(remarks)) return false;
      if ($('has-remarks').checked && !file.remarks.trim()) return false;
      const full = searchText(`${file.name} ${file.folder} ${folders.find(f=>f.key===file.folder).label} ${file.remarks}`);
      if (excluded.some(word=>full.includes(word))) return false;
      const haystack = field === 'all' ? full : field === 'folder' ? searchText(`${file.folder} ${folders.find(f=>f.key===file.folder).label}`) : searchText(file[field]);
      if (!query) return true;
      if (mode === 'phrase') return haystack.includes(query.replace(/^"|"$/g,''));
      return mode === 'any' ? queryTokens.some(word=>haystack.includes(word)) : queryTokens.every(word=>haystack.includes(word));
    });
    const sort = $('sort').value;
    result.sort((a,b) => {
      if (sort === 'folder-asc') return collator.compare(a.folder,b.folder) || collator.compare(a.name,b.name);
      return (sort === 'name-desc' ? -1 : 1) * collator.compare(a.name,b.name) || collator.compare(a.path,b.path);
    });
    return result;
  }
  function link(file, kind) {
    const label = file.extension.toUpperCase() || 'file';
    const a = element('a',kind === 'download' ? 'download-link' : 'open-link');
    const text = kind === 'download' ? (file.downloadText || `Download ${label}`) : (file.openText || `Open ${label}`);
    a.append(icon(kind === 'download' ? 'download' : 'eye'), element('span','',text));
    a.href = fileUrl(file); a.setAttribute('aria-label',`${text}: ${file.name}`);
    if (kind === 'download') {a.download=file.name; return a;}
    a.target='_blank'; a.rel='noopener noreferrer';
    if (['pdf','png','jpg','jpeg','gif','webp','avif','bmp','svg'].includes(file.extension)) {
      a.addEventListener('click',e => {if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); preview(file);});
    } else if (['doc','docx','xls','xlsx','ppt','pptx'].includes(file.extension) && /^https?:/.test(location.protocol)) {
      a.href = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl(file))}`;
      a.title='Open with Microsoft Office web viewer';
    } else {a.title='Open original file; your browser may download this format';}
    return a;
  }
  function groupFiles(items) {
    const groups = new Map();
    for (const file of items) {
      const extensionStart = file.name.lastIndexOf('.');
      const stem = extensionStart > 0 ? file.name.slice(0, extensionStart) : file.name;
      const separator = Math.max(stem.lastIndexOf('.'), stem.lastIndexOf('_'));
      const name = separator > 0 ? stem.slice(0, separator) : stem;
      const category = separator > 0 ? stem.slice(separator + 1) : '';
      const directory = file.path.split('/').slice(2, -1).join('/');
      const key = `${directory}\u0000${name}`;
      if (!groups.has(key)) groups.set(key, {name, directory, files: []});
      groups.get(key).files.push({file, category});
    }
    return [...groups.values()];
  }
  function variantLabel(entry) {
    const extension = entry.file.extension.toUpperCase();
    return entry.category ? `${entry.category} (${extension})` : extension;
  }
  function row(fileGroup, index) {
    const entries = fileGroup.files, grouped = entries.length > 1, file = entries[0].file;
    const tr = document.createElement('tr');
    const sn = element('td','sn',String(index));
    const folderCell = element('td','folder-cell');
    const folderTags = element('div','folder-tags');
    for (const folder of new Set(entries.map(entry => entry.file.folder))) {
      const tag = element('span','folder-tag'); tag.append(icon('folder'),document.createTextNode(folder)); folderTags.append(tag);
    }
    folderCell.append(folderTags);
    const nameCell = element('td','name-cell'); const nameGroup = element('div','file-name');
    const types = [...new Map(entries.map(entry => [entry.file.extension, entry.file])).values()];
    for (const typeFile of types) {
      const type = element('span',`type-icon ${typeFile.folder}`,typeFile.extension.toUpperCase().slice(0,5));
      type.setAttribute('aria-hidden','true'); nameGroup.append(type);
    }
    const titleGroup = element('div');titleGroup.append(element('span','file-title',grouped?fileGroup.name:file.name));
    const sizes = entries.reduce((sum, entry) => sum + (Number.isFinite(entry.file.size) ? entry.file.size : 0), 0);
    const variants = entries.map(variantLabel).join(' · ');
    titleGroup.append(element('span','file-meta',grouped?[variants,bytes(sizes),fileGroup.directory].filter(Boolean).join(' · '):[bytes(file.size),fileGroup.directory].filter(Boolean).join(' · ')));
    nameGroup.append(titleGroup);nameCell.append(nameGroup);
    const linkCell=element('td','link-cell');
    if (grouped) {
      const linkList=element('div','file-link-list');
      for (const entry of entries) {
        const linkGroup=element('div','file-link-group');
        linkGroup.append(element('span','variant-label',variantLabel(entry)));
        const links=element('div','file-links');links.append(link(entry.file,'open'),link(entry.file,'download'));
        linkGroup.append(links);linkList.append(linkGroup);
      }
      linkCell.append(linkList);
    } else {
      const links=element('div','file-links');links.append(link(file,'open'),link(file,'download'));linkCell.append(links);
    }
    const remarksCell=element('td','remarks-cell');
    if (grouped) {
      const remarkList=element('div','remark-list');
      for (const entry of entries) {
        const remarkEntry=element('div','remark-entry');
        remarkEntry.append(element('span','remark-label',variantLabel(entry)),element('span',entry.file.remarks?'remarks':'no-remark',entry.file.remarks||'—'));
        remarkList.append(remarkEntry);
      }
      remarksCell.append(remarkList);
    } else remarksCell.append(element('span',file.remarks?'remarks':'no-remark',file.remarks||'—'));
    tr.append(sn,folderCell,nameCell,linkCell,remarksCell);return tr;
  }
  function render() {
    state.filtered=getFiltered();const n=state.filtered.length,groups=groupFiles(state.filtered),rowCount=groups.length,size=Number($('page-size').value),pages=Math.max(1,Math.ceil(rowCount/size));state.page=Math.min(state.page,pages);
    const start=(state.page-1)*size,end=Math.min(start+size,rowCount),fragment=document.createDocumentFragment();
    for(let i=start;i<end;i++)fragment.append(row(groups[i],i+1));$('file-rows').replaceChildren(fragment);
    const folder=folders.find(f=>f.key===state.folder);$('view-title').textContent=folder.label;
    $('view-description').textContent=state.folder==='all'?'PDFs, images, documents, spreadsheets and presentations.':`Files / ${folder.key}`;
    $('total-pill').textContent=`${files.length} ${files.length===1?'file':'files'}`;
    $('result-summary').textContent=n===files.length?`${n} ${n===1?'file':'files'} in the catalogue`:`${n} of ${files.length} files match`;
    const count=advancedCount();$('filter-count').hidden=!count;$('filter-count').textContent=count;
    const filtered=!!($('search').value.trim()||count||state.folder!=='all');$('clear-all').hidden=!filtered;
    $('empty-state').hidden=n>0;$('empty-reset').hidden=!files.length;
    $('empty-title').textContent=files.length?'No matching files':'No files added yet';
    $('empty-description').textContent=files.length?'Try a different search or clear your filters.':'Your catalogue is ready. Add files to the PDF, images, docs, spreadsheet or powerpoints folders.';
    $('page-summary').textContent=rowCount?`Rows ${start+1}–${end} of ${rowCount} · Page ${state.page} of ${pages}`:'0 rows';
    $('previous').disabled=state.page<=1;$('next').disabled=state.page>=pages;
    updateScrollButtons();
  }
  function resetAdvanced() {for(const id of advancedIds){if($(id).type==='checkbox')$(id).checked=defaults[id];else $(id).value=defaults[id];}state.page=1;render();}
  function resetAll() {$('search').value='';state.folder='all';resetAdvanced();folderNavigation();$('search').focus();}
  function updateScrollButtons() {
    const previewOpen=$('preview').open,nearBottom=window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-300;
    $('go-top').hidden=window.scrollY<300 || previewOpen;
    $('go-bottom').hidden=nearBottom || previewOpen;
  }
  function scrollToEdge(edge) {
    const reducedMotion=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({top:edge==='top'?0:document.documentElement.scrollHeight,behavior:reducedMotion?'auto':'smooth'});
  }
  window.addEventListener('scroll',updateScrollButtons,{passive:true});
  window.addEventListener('resize',updateScrollButtons,{passive:true});
  new MutationObserver(updateScrollButtons).observe($('catalogue-app'),{attributes:true,attributeFilter:['hidden']});
  $('go-top')?.addEventListener('click',()=>scrollToEdge('top'));
  $('go-bottom')?.addEventListener('click',()=>scrollToEdge('bottom'));
  updateScrollButtons();
  let nativePreviewFullscreen=false;
  function previewIsFullscreen() {return !!$('preview-shell') && document.fullscreenElement===$('preview-shell');}
  function setPreviewExpanded(expanded) {
    if(!$('preview-fullscreen'))return;
    $('preview').classList.toggle('preview-expanded',expanded);
    const button=$('preview-fullscreen'),label=expanded?'Exit fullscreen':'Enter fullscreen';
    button.setAttribute('aria-pressed',String(expanded));button.setAttribute('aria-label',label);button.title=label;
    button.querySelector('use').setAttribute('href',expanded?'#i-collapse':'#i-expand');
    button.querySelector('span').textContent=expanded?'Exit full screen':'Full screen';
  }
  $('preview-fullscreen')?.addEventListener('click',async()=>{
    const dialog=$('preview'),shell=$('preview-shell'),button=$('preview-fullscreen');
    if(!dialog.open)return;
    button.disabled=true;
    try {
      if(dialog.classList.contains('preview-expanded')) {
        if(document.fullscreenElement===shell && document.exitFullscreen)await document.exitFullscreen();
        setPreviewExpanded(document.fullscreenElement===shell);
      } else {
        setPreviewExpanded(true);
        // Keep a full-window view when the browser cannot enter native fullscreen.
        if(shell.requestFullscreen && document.fullscreenEnabled) {
          try {await shell.requestFullscreen();}catch {/* The full-window view remains available. */}
        }
        if(!dialog.open && document.fullscreenElement===shell && document.exitFullscreen)await document.exitFullscreen();
        if(!dialog.open)setPreviewExpanded(false);
      }
    } catch {/* A browser-controlled fullscreen exit can be retried with Escape. */}
    finally {button.disabled=false;}
  });
  document.addEventListener('fullscreenchange',()=>{
    const active=previewIsFullscreen();
    if(active || nativePreviewFullscreen)setPreviewExpanded(active);
    nativePreviewFullscreen=active;
  });
  $('preview').addEventListener('cancel',event=>{
    if(!$('preview').classList.contains('preview-expanded'))return;
    event.preventDefault();
    if(previewIsFullscreen() && document.exitFullscreen)document.exitFullscreen().catch(()=>{});
    else setPreviewExpanded(false);
  });
  function preview(file) {
    const dialog=$('preview');setPreviewExpanded(false);$('preview-title').textContent=file.name;
    $('preview-note').textContent=file.extension==='pdf'?'PDF preview · If a preview is unavailable, use Download.':'Image preview';
    $('preview-download').href=fileUrl(file);$('preview-download').download=file.name;
    const content=$('preview-content');content.replaceChildren();
    if(file.extension==='pdf'){const frame=document.createElement('iframe');frame.title=`PDF preview: ${file.name}`;frame.src=fileUrl(file);content.append(frame);}
    else {const img=document.createElement('img');img.alt=file.name;img.src=fileUrl(file);img.addEventListener('error',()=>{content.replaceChildren(element('p','preview-fallback','Preview unavailable. Use Download to save the file.'));},{once:true});content.append(img);}
    dialog.showModal();$('preview-close').focus();updateScrollButtons();
  }
  $('preview-close').addEventListener('click',()=>$('preview').close());
  $('preview').addEventListener('close',()=>{
    if(previewIsFullscreen() && document.exitFullscreen)document.exitFullscreen().catch(()=>{});
    setPreviewExpanded(false);$('preview-content').replaceChildren();updateScrollButtons();
  });
  $('preview').addEventListener('click',e=>{if(e.target===$('preview')){const r=$('preview').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('preview').close();}});
  $('advanced-toggle').addEventListener('click',()=>{const open=$('advanced').hidden;$('advanced').hidden=!open;$('advanced-toggle').setAttribute('aria-expanded',String(open));});
  let timer; for(const id of ['search','nepali-normalized',...advancedIds]){const control=$(id);control?.addEventListener(control.tagName==='SELECT'||control.type==='checkbox'?'change':'input',()=>{clearTimeout(timer);timer=setTimeout(()=>{state.page=1;render();},100);});}
  $('reset-advanced').addEventListener('click',resetAdvanced);$('clear-all').addEventListener('click',resetAll);$('empty-reset').addEventListener('click',resetAll);
  $('sort').addEventListener('change',()=>{state.page=1;render();});
  $('sort-folder').addEventListener('click',()=>{$('sort').value='folder-asc';state.page=1;render();});
  $('sort-name').addEventListener('click',()=>{$('sort').value=$('sort').value==='name-asc'?'name-desc':'name-asc';state.page=1;render();});
  $('page-size').addEventListener('change',()=>{state.page=1;render();});$('previous').addEventListener('click',()=>{if(state.page>1)state.page--;render();});$('next').addEventListener('click',()=>{state.page++;render();});
  document.addEventListener('keydown',e=>{const editing=['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable;if(e.key==='/'&&!editing&&!e.ctrlKey&&!e.metaKey&&!$('preview').open){e.preventDefault();$('search').focus();}if(e.key==='Escape'&&e.target===$('search')){$('search').value='';state.page=1;render();}});
  if(data.generatedAt){const date=new Date(data.generatedAt);if(!Number.isNaN(date.valueOf()))$('updated-at').textContent=`Catalogue updated ${date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}`;}
  folderNavigation();render();
  if(!window.RAYA_INDEX){$('result-summary').textContent='Catalogue index could not load. Please refresh the page.';$('empty-title').textContent='Catalogue unavailable';$('empty-description').textContent='Please refresh the page or check that files-index.js is available.';}
})();
