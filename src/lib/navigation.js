export const NEW_TAB_LINK_PROPS = {
  target: '_blank',
  rel: 'noreferrer',
}

export const isModifiedNavigationEvent = (event) => {
  if (!event) return false
  return Boolean(event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1)
}

export const openPathInNewTab = (path) => {
  if (!path || typeof window === 'undefined') return

  const absoluteUrl = new URL(path, window.location.origin).toString()
  window.open(absoluteUrl, '_blank', 'noopener,noreferrer')
}

export const followAppPath = (navigate, path, options = {}) => {
  const { event, state, replace = false, defaultNewTab = false } = options

  if (!path) return

  if (defaultNewTab || isModifiedNavigationEvent(event)) {
    if (event?.preventDefault) event.preventDefault()
    openPathInNewTab(path)
    return
  }

  navigate(path, { state, replace })
}