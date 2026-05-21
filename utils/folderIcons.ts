import { FOLDER_ICONS, type FolderIconId } from "@/components/docs/folderIcons";

export function isValidFolderIcon(icon: string): icon is FolderIconId {
  return icon in FOLDER_ICONS;
}
