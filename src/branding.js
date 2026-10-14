// oto stereo branding.
let otoLogoAction = null;
function drawStereoLogo(c, s, x, y, height = 20) {
  c.save(); c.translate(x, y - height); c.strokeStyle = c.fillStyle = '#f4ecd7';
  c.lineWidth = Math.max(1, s.outline * .35);
  rect(c, -5, -3, s.logo === '音' ? height + 10 : height * 2 + 10, height + 8, '#193738', '#c5cdb7', 1, 3);
  c.fillStyle = c.strokeStyle = '#f4ecd7';
  if (s.logo === '音') {
    c.scale(height / 24, height / 24); c.lineWidth = 1.8; c.lineCap = 'round';
    c.stroke(new Path2D('M7 4h10M12 1v3M8 6l2 4M16 6l-2 4M5 11h14M7 14h10v9H7zM7 18h10'));
  } else {
    c.font = 'bold ' + height + 'px Arial, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText('oto', 0, height);
  }
  c.restore();
}
function openOtoLogoPicker(action) {
  otoLogoAction = action || null;
  if (typeof otoSetView === 'function') otoSetView('expanded');
  const dialog = $('#oto-logo-picker');
  if (!dialog.open) dialog.showModal();
  $('#oto-pick-latin').focus();
}
function restoreOtoLogo(profile) {
  if (state.logoPicked || profile) return;
  try { const choice = localStorage.getItem('oto-stereo-logo'); if (['oto','音'].includes(choice)) state = {...state, logo:choice, logoPicked:true}; } catch {}
}
for (const [id, logo] of [['oto-pick-latin','oto'],['oto-pick-kanji','音']]) $('#'+id).addEventListener('click', () => {
  applyPatch({logo, logoPicked:true});
  try { localStorage.setItem('oto-stereo-logo', logo); } catch {}
  $('#oto-logo-picker').close();
  const action = otoLogoAction; otoLogoAction = null; action?.();
});
$('#oto-logo-picker').addEventListener('cancel', event => event.preventDefault());
$('#stereo-logo').addEventListener('change', () => applyPatch({logo:$('#stereo-logo').value, logoPicked:true}));
// End oto stereo branding.
