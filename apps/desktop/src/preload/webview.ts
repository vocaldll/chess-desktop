import { installMasterGain } from './audio'

const BACK_BUTTON = 3
const FORWARD_BUTTON = 4

installMasterGain()

window.addEventListener('mouseup', (event) => {
  if (event.button === BACK_BUTTON) {
    event.preventDefault()
    history.back()
  } else if (event.button === FORWARD_BUTTON) {
    event.preventDefault()
    history.forward()
  }
})
