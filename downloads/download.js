'use strict';
function detectPlatform(navigatorInfo) {
  const name = `${navigatorInfo.userAgentData?.platform || ''} ${navigatorInfo.platform || ''} ${navigatorInfo.userAgent || ''}`;
  if (/Android|iPhone|iPad/i.test(name)) return '';
  if (/Win/i.test(name)) return 'windows';
  if (/Mac/i.test(name)) return 'macos';
  if (/Linux|X11/i.test(name)) return 'linux';
  return '';
}
function artifactFor(assets, os) {
  const patterns = {
    windows: /^Strata-\d+\.\d+\.\d+-windows-x64\.exe$/,
    macos: /^Strata-\d+\.\d+\.\d+-macos-universal\.dmg$/,
    linux: /^Strata-\d+\.\d+\.\d+-linux-x86_64\.tar\.gz$/,
  };
  return assets.find(asset => patterns[os]?.test(asset.name));
}
window.StrataDownloads = {detectPlatform, artifactFor};
(async () => {
  const $ = id => document.getElementById(id);
  const names = {windows:'Windows', macos:'Mac', linux:'Linux'};
  const requirements = {windows:'Windows 10 / 11 de 64 bits', macos:'macOS 14 o posterior · Intel y Apple Silicon', linux:'Ubuntu 24.04 o compatible reciente · x86_64'};
  const instructions = {
    windows:'Abre el archivo .exe y sigue los pasos del instalador. Tus proyectos se guardan por separado del paquete de descarga.',
    macos:'Abre el archivo .dmg y arrastra Strata a Aplicaciones. Luego abre Strata desde esa carpeta. Tus manuscritos se conservan al actualizar la aplicación.',
    linux:'Extrae toda la carpeta del .tar.gz. Dentro de ella ejecuta «sh instalar.sh» para agregar Strata al menú de aplicaciones de tu usuario. No necesita sudo. Requiere las bibliotecas de escritorio indicadas en la guía de distribución.',
  };
  let selected = detectPlatform(navigator) || 'windows', assets = [], error = '', repository = '';
  function render() {
    document.querySelectorAll('[data-os]').forEach(button=>button.setAttribute('aria-pressed', String(button.dataset.os===selected)));
    $('download-title').textContent = `Strata para ${names[selected]}`;
    $('minimum').textContent = requirements[selected];
    $('instructions').textContent = instructions[selected];
    const asset = artifactFor(assets, selected);
    const link = $('download');
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    $('status').textContent = error || 'El instalador de este sistema todavía no está publicado.';
    if (asset && asset.browser_download_url?.startsWith(`https://github.com/${repository}/releases/download/`)) {
      link.href = asset.browser_download_url;
      link.setAttribute('aria-disabled', 'false');
      $('status').textContent = `${(asset.size / 1024 / 1024).toFixed(0)} MB · Descarga directa desde GitHub Releases`;
    }
  }
  document.querySelectorAll('[data-os]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.os;render();}));
  render();
  try {
    const configResponse = await fetch('./config.json');
    if (!configResponse.ok) throw new Error('No se pudo cargar la configuración de descargas.');
    const config = await configResponse.json();
    repository = config.repository;
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Las descargas se habilitarán cuando se conecte el repositorio de Strata.');
    const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {headers:{Accept:'application/vnd.github+json'}});
    if (!response.ok) throw new Error('Todavía no hay una versión pública disponible.');
    const release = await response.json();
    assets = Array.isArray(release.assets) ? release.assets : [];
    $('version').textContent = release.tag_name || '';
  } catch (exception) { error = exception.message; }
  render();
})();
