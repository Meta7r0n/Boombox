// Pure protocol validation shared by the runtime and regression tests.
export function otoValidHostMessage(event, parent, origins) {
  return event.source === parent && origins.includes(event.origin) && event.data?.channel === 'oto-v1' &&
    ['view','dock','status'].includes(event.data.command);
}
export function otoCleanHandoff(value) {
  if (!value || value.version !== 1 || typeof value.tapeId !== 'string' || value.tapeId.length > 80 ||
      !Number.isInteger(value.index) || value.index < 0 || value.index > 100 || !Number.isFinite(value.seconds) ||
      value.seconds < 0 || value.seconds > 86400 || !['oto','音'].includes(value.logo)) return null;
  if (value.radioId !== null && (typeof value.radioId !== 'string' || value.radioId.length > 80)) return null;
  return {version:1, tapeId:value.tapeId, index:value.index, seconds:value.seconds, logo:value.logo, radioId:value.radioId};
}
