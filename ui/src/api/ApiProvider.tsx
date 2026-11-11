import { createContext, type ReactNode, useContext } from 'react'
import { httpApi, type WorkspaceApi } from './client.ts'

const ApiContext = createContext<WorkspaceApi>(httpApi)

/** 데이터 경계 주입. 생략하면 실제 HTTP 구현을 쓴다. */
export function ApiProvider({ api, children }: { api: WorkspaceApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
}

export const useApi = () => useContext(ApiContext)
