import { useEffect, useState } from 'react'

/** 화면 위치는 URL 해시에 둔다: 새로고침·뒤로 가기·공유가 그대로 동작한다. */
export type Route = { kind: 'brief'; id?: string } | { kind: 'notes' }

function parse(hash: string): Route {
  const [, kind, id] = hash.replace(/^#/, '').split('/')
  if (kind === 'notes') return { kind: 'notes' }
  return id ? { kind: 'brief', id: decodeURIComponent(id) } : { kind: 'brief' }
}

export const href = (r: Route) =>
  r.kind === 'notes' ? '#/notes' : `#/brief/${encodeURIComponent(r.id ?? '')}`

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash))
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
