// GitHub Pages device runtime.
let otoDeviceLibrary=null;
async function otoDeviceApi(path,options) {
  otoDeviceLibrary ||= createDeviceLibrary({store:createIndexedDeviceStore(window.indexedDB),crypto:window.crypto,catalog:starterTracks,secretCatalog:secretSongCatalog,tunes:secretTunes});
  return otoDeviceLibrary.handle(path,options,profileSession);
}
if(window.OTO_LOCAL_MODE) {
  for(const id of ['radio-open','radio-open-stage','oto-radio','phone-open']){const button=$('#'+id);button.disabled=true;button.title='Shared stations and tape delivery need the online edition.';}
  $('#oto-signin').hidden=true;
  $('#profile-summary').textContent='Device edition: profiles, songs and tapes are saved in this browser.';
  void navigator.storage?.persist?.().catch(()=>{});
}
// End GitHub Pages device runtime.
