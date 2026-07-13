import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'
import './ReloadPrompt.css'

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('SW Registered: ' + r)
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="ReloadPrompt-container glass-panel">
      <div className="ReloadPrompt-toast">
        <div className="ReloadPrompt-message">
          { offlineReady
            ? <span>App ready to work offline</span>
            : <span>New content available, click on reload button to update.</span>
          }
        </div>
        <div className="ReloadPrompt-buttons">
          { needRefresh && (
            <button className="ReloadPrompt-toast-button" onClick={() => updateServiceWorker(true)}>
              <RefreshCw size={14} /> Reload
            </button>
          )}
          <button className="ReloadPrompt-toast-button outline" onClick={() => close()}>Close</button>
        </div>
      </div>
    </div>
  )
}
