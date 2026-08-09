!include nsDialogs.nsh
!include MUI2.nsh

!ifdef BUILD_UNINSTALLER
  Var DeleteAppDataCheckbox
  Var DeleteAppData

  !macro customUnWelcomePage
    UninstPage custom un.DeleteAppDataPageCreate un.DeleteAppDataPageLeave
  !macroend

  Function un.DeleteAppDataPageCreate
    !insertmacro MUI_HEADER_TEXT "Uninstall ${PRODUCT_NAME}" "Choose uninstall options."

    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    GetDlgItem $0 $HWNDPARENT 1
    SendMessage $0 ${WM_SETTEXT} 0 "STR:$(^UninstallBtn)"

    ${NSD_CreateLabel} 0 0 100% 28u "${PRODUCT_NAME} will be removed from your computer."
    Pop $0

    ${NSD_CreateCheckbox} 0 40u 100% 12u "Delete application data"
    Pop $DeleteAppDataCheckbox
    ${NSD_Uncheck} $DeleteAppDataCheckbox

    nsDialogs::Show
  FunctionEnd

  Function un.DeleteAppDataPageLeave
    ${NSD_GetState} $DeleteAppDataCheckbox $DeleteAppData
  FunctionEnd

  !macro customUnInstall
    ${If} $DeleteAppData == ${BST_CHECKED}
      ${If} $installMode == "all"
        SetShellVarContext current
      ${EndIf}

      RMDir /r "$APPDATA\${APP_FILENAME}"
      !ifdef APP_PRODUCT_FILENAME
        RMDir /r "$APPDATA\${APP_PRODUCT_FILENAME}"
      !endif
      !ifdef APP_PACKAGE_NAME
        RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
      !endif

      ${If} $installMode == "all"
        SetShellVarContext all
      ${EndIf}
    ${EndIf}
  !macroend
!endif
