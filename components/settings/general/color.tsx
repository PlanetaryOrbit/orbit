"use client"

import axios from "axios"
import type toast from "react-hot-toast"
import { useRecoilState } from "recoil"
import { workspacestate } from "@/state"
import type { FC } from "@/types/settingsComponent"
import { IconCheck } from "@tabler/icons"
import clsx from "clsx"
import { useEffect, useState } from "react"

type props = {
  triggerToast: typeof toast
  isSidebarExpanded: boolean // Add a prop to track sidebar state
}

const Color: FC<props> = ({ triggerToast, isSidebarExpanded }) => {
  const [workspace, setWorkspace] = useRecoilState(workspacestate)
  const [selectedColor, setSelectedColor] = useState<string>(workspace?.groupTheme || "")

  useEffect(() => {
    if (workspace?.groupTheme) {
      setSelectedColor(workspace.groupTheme)
    }
  }, [workspace])

  const updateColor = async (color: string) => {
    try {
      setSelectedColor(color)
      setWorkspace((prev) => ({
        ...prev,
        groupTheme: color,
      }))

      // Update the CSS variable
      const rgbValue = getRGBFromTailwindColor(color)
      document.documentElement.style.setProperty("--group-theme", rgbValue)

      // Update the color in the database
      const res = await axios.patch(`/api/workspace/${workspace.groupId}/settings/general/color`, { color })

      if (res.status === 200) {
        triggerToast.success("Color updated successfully!")
      } else {
        triggerToast.error("Failed to update color.")
        handleRevert()
      }
    } catch (error) {
      triggerToast.error("Something went wrong.")
      handleRevert()
    }
  }

  // Helper function to revert changes on error
  const handleRevert = () => {
    const previousColor = workspace?.groupTheme || "bg-pink-500"
    setSelectedColor(previousColor)
    setWorkspace((prev) => ({
      ...prev,
      groupTheme: previousColor,
    }))
    const rgbValue = getRGBFromTailwindColor(previousColor)
    document.documentElement.style.setProperty("--group-theme", rgbValue)
  }

  const colors = [
    "bg-orbit",
    "bg-blue-500",
    "bg-red-500",
    "bg-red-700",
    "bg-green-500",
    "bg-green-600",
    "bg-yellow-500",
    "bg-orange-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-black",
    "bg-gray-500",
  ]

  return (
    <div className="ml-0">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-left">
        Choose a color theme for your workspace
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
        {colors.map((color, i) => (
          <button
            key={i}
            onClick={() => updateColor(color)}
            className={clsx("relative aspect-square rounded-lg transition-transform hover:scale-105 z-0", color)}
          >
            {selectedColor === color && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 rounded-lg">
                <IconCheck size={16} className="text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function getRGBFromTailwindColor(tw: any): string {
  // Default fallback color (pink)
  const fallback = "236, 72, 153" // pink-500

  // Check if tw is a valid string
  if (!tw || typeof tw !== "string") {
    // Don't log warnings for null/undefined as these are expected during initialization
    if (tw !== null && tw !== undefined) {
      console.warn("Invalid color value:", tw)
    }
    return fallback
  }

  // Extract the color name from the bg-{color} class
  const colorName = tw.replace("bg-", "")

  // Handle special case for orbit color
  if (colorName === "orbit") {
    return "0, 112, 240" // Custom orbit blue color
  }

  // Handle common colors with hardcoded RGB values
  const colorMap: Record<string, string> = {
    "blue-500": "59, 130, 246",
    "red-500": "239, 68, 68",
    "red-700": "185, 28, 28",
    "green-500": "34, 197, 94",
    "green-600": "22, 163, 74",
    "yellow-500": "234, 179, 8",
    "orange-500": "249, 115, 22",
    "purple-500": "168, 85, 247",
    "pink-500": "236, 72, 153",
    black: "0, 0, 0",
    "gray-500": "107, 114, 128",
  }

  return colorMap[colorName] || fallback
}

Color.title = "Customize"

export default Color
