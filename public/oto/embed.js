/* oto · 音 — persistent iframe integration. No player reload on minimize. */
(() => {
  const script = document.currentScript;
  const mounted = new WeakMap();
  function mount({playerURL, container=document.body, dock='bottom'}={}) {
    if (mounted.has(container)) return mounted.get(container);
    const url = new URL(playerURL || '/app/', location.href);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) throw Error('Use an HTTPS oto player URL.');
    url.searchParams.set('embed','1');
    const frame = document.createElement('iframe');
    frame.title = 'oto · 音 music player'; frame.src = url.href;
    frame.allow = 'autoplay; fullscreen'; frame.setAttribute('allowfullscreen','');
    Object.assign(frame.style,{position:'fixed',left:'0',width:'100%',border:'0',zIndex:'2147483000',background:'#172a2c'});
    let expanded=false, side=dock === 'top' ? 'top' : 'bottom';
    const send = (command, detail={}) => frame.contentWindow?.postMessage({channel:'oto-v1',command,...detail},url.origin);
    const resize = () => {
      const space = matchMedia('(max-width:760px)').matches ? 120 : 86;
      Object.assign(frame.style,{height:expanded?'94dvh':space+'px',top:side==='top'?'0':'auto',bottom:side==='bottom'?'0':'auto'});
      document.documentElement.style.setProperty('--oto-dock-space',space+'px');
      document.documentElement.dataset.otoDock = side;
    };
    const setView = view => {expanded=view==='expanded';resize();send('view',{view:expanded?'expanded':'dock'});};
    const onMessage = event => {
      if (event.origin !== url.origin || event.source !== frame.contentWindow || event.data?.channel !== 'oto-v1') return;
      if (event.data.type === 'view') {expanded=event.data.view==='expanded';resize();}
      if (event.data.type === 'dock') {side=event.data.side==='top'?'top':'bottom';resize();}
      if (event.data.type === 'status') window.dispatchEvent(new CustomEvent('oto:status',{detail:event.data}));
    };
    const api = {expand:()=>setView('expanded'),minimize:()=>setView('dock'),dock:value=>{side=value==='top'?'top':'bottom';resize();send('dock',{side});},
      destroy:()=>{window.removeEventListener('message',onMessage);window.removeEventListener('resize',resize);frame.remove();mounted.delete(container);document.documentElement.style.removeProperty('--oto-dock-space');}};
    mounted.set(container,api);
    window.addEventListener('message',onMessage);window.addEventListener('resize',resize);
    frame.addEventListener('load',()=>{send('status');send('dock',{side});send('view',{view:expanded?'expanded':'dock'});});
    container.append(frame);resize();return api;
  }
  window.OtoPlayer = {mount};
  if (script && !script.hasAttribute('data-manual')) window.oto = mount({playerURL:script.dataset.player || new URL('/app/',script.src).href,dock:script.dataset.dock});
})();
