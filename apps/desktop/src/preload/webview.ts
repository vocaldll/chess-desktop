import { installMasterGain } from './audio'
import { installLichessReviewBridge } from './lichess-review'

const BACK_BUTTON = 3
const FORWARD_BUTTON = 4

installMasterGain()
installLichessReviewBridge()

window.addEventListener('mouseup', (event) => {
  if (event.button === BACK_BUTTON) {
    event.preventDefault()
    history.back()
  } else if (event.button === FORWARD_BUTTON) {
    event.preventDefault()
    history.forward()
  }
})
