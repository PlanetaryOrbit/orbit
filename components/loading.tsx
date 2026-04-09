"use client";

import { useState, useEffect } from "react";

const messages = [
  "Hold tight while we load everything for you...",
  "Good things are coming towards you.",
  "Did you know? Honey never spoils. Archaeologists found 3,000-year-old honey in Egyptian tombs.",
  "The Eiffel Tower grows about 15cm taller in summer due to thermal expansion.",
  "You're doing great. Really.",
  "A group of flamingos is called a 'flamboyance'.",
  "Your next favourite thing might be just around the corner.",
  "Otters hold hands while sleeping so they don't drift apart.",
  "Something wonderful is on its way.",
  "Crows can recognise human faces and remember them for years.",
  "A day you'll always remember might be just ahead.",
  "Bananas are technically berries. Strawberries are not.",
  "The shortest war in history lasted 38 to 45 minutes.",
  "You've already made it through 100% of your bad days.",
  "Wombats produce cube-shaped droppings. No other animal does this.",
  "The universe is under no obligation to make sense to you — and yet, here you are.",
  "Scotland's national animal is the unicorn.",
  "A small act of kindness you've forgotten probably meant the world to someone.",
  "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.",
  "Trees can communicate and share nutrients through underground fungal networks.",
  "The dot above a lowercase 'i' is called a tittle.",
  "You are made of stardust. Literally.",
  "Sharks are older than trees. They've been around for about 450 million years.",
  "The best is not behind you.",
  "Almost there. Good things take a moment.",
  "We are almost ready.",
  "Maybe consider taking a coffee while we load everything.",
];

export default function LoadingScreen({ done }: { done: boolean }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 500);
    }, 6000);
    return () => clearInterval(interval);
  }, [done]);

  return (
    <div className="flex flex-col items-center justify-center h-screen dark:bg-zinc-900 bg-white gap-6">
      <svg
        viewBox="0 0 1784 1784"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        style={{
          transition: "color 1.2s ease",
          color: done ? "var(--color-text-primary, #09090b)" : "rgb(156 163 175 / 0.7)",
        }}
        className={`w-40 h-40 ${!done ? "animate-pulse" : ""}`}
      >
        <g clipPath="url(#clip0)">
          <path d="M845.333 0.799618C638 12.6663 446.933 92.133 294 230C263.6 257.333 231.333 290.533 236.666 288.933C240.933 287.6 301.6 281.6 335.333 279.333C404.533 274.533 503.6 274.8 569.333 280C772 296 950.8 350.933 1110 446L1132.67 459.466L1145.33 456.533C1152.27 454.8 1205.73 442 1264 428C1322.27 414 1406.4 393.866 1450.8 383.333C1495.33 372.666 1537.87 361.866 1545.47 359.2C1561.33 353.733 1590.4 341.466 1591.33 340C1593.47 336.533 1537.07 273.866 1504 242.933C1419.6 164.266 1328.67 106 1225.33 64.2663C1143.07 31.1996 1064.13 12.133 971.466 3.19962C951.066 1.19962 866.133 -0.400382 845.333 0.799618Z"/>
          <path d="M402 392.933C360.533 394.266 302.4 398.533 260.933 403.333C212.666 408.933 138.133 420.666 134 423.2C130.533 425.466 108.8 463.6 93.3331 494.4C59.1997 563.066 34.9331 632.933 18.9331 708.4L15.0664 726.8L19.1997 725.866C31.1997 723.333 237.733 674.8 342 650C605.066 587.333 962.666 500.933 962.666 499.866C962.666 498.8 928.8 484 902 473.333C754.533 414.666 582.266 386.933 402 392.933Z"/>
          <path d="M1646.67 443.466C1625.87 453.466 1595.07 466 1577.07 471.866C1567.87 474.8 1521.33 486.533 1473.73 497.866C1337.73 530.266 1258.13 549.466 1257.73 549.866C1257.47 550.133 1266.4 558.266 1277.6 568C1304.4 591.466 1361.33 648.4 1384.8 675.333C1445.07 744.4 1498.8 820.666 1544.4 902C1558.67 927.6 1581.33 971.333 1590.13 990.666C1593.6 998.4 1596.67 1004.8 1596.8 1005.07C1597.6 1006.4 1652.8 975.066 1685.73 954.4C1727.6 928.266 1782.27 890.533 1783.73 886.933C1784.8 884 1781.73 823.333 1779.33 800C1767.87 691.6 1738.27 589.866 1690.4 494C1680 473.333 1660.4 437.2 1659.6 437.333C1659.47 437.466 1653.6 440.133 1646.67 443.466Z"/>
          <path d="M893.333 637.466C512.267 729.866 224.267 798.533 43.8667 840.133L1.6 849.866L0.8 855.866C0.4 859.066 0 866.266 0 871.866V882.133L9.06667 886.533C420.933 1091.87 776.267 1179.47 1093.33 1154C1205.07 1144.93 1314.8 1121.6 1416.8 1085.33C1441.2 1076.53 1489.33 1057.6 1491.07 1056.13C1492.4 1054.8 1454.4 979.466 1438.13 951.333C1352.8 803.2 1249.47 685.866 1125.2 595.6C1117.33 590 1110.13 585.333 1109.2 585.466C1108.13 585.6 1011.07 608.933 893.333 637.466Z"/>
          <path d="M9.86685 1024.8C10.4002 1029.07 12.4002 1040.8 14.1335 1050.67C43.3335 1210.8 116 1360.93 222.8 1481.47C240 1500.93 276.267 1537.47 296 1555.2C510.8 1748.53 804.133 1825.07 1088.13 1762C1248.8 1726.27 1397.47 1645.2 1515.87 1528.8C1548.8 1496.27 1575.73 1466.13 1598.67 1436L1607.07 1424.93L1604.8 1412.8C1596.93 1370.93 1582.8 1312.4 1570 1268C1563.87 1246.53 1541.6 1177.73 1537.33 1167.2C1536.27 1164.4 1535.6 1164.53 1510.4 1174.67C1395.73 1220.8 1279.2 1250.53 1155.33 1265.2C1063.6 1276.13 958.933 1277.73 860 1269.87C610 1250.13 340.267 1172.13 47.3335 1034.67C28.2668 1025.73 11.8668 1018.13 10.8002 1017.73C9.33352 1017.07 9.20018 1018.4 9.86685 1024.8Z"/>
          <path d="M1763.33 1043.47C1747.2 1054.8 1673.33 1097.87 1650.93 1109.2C1644.4 1112.53 1642.53 1114 1643.07 1115.73C1643.47 1116.93 1649.33 1133.87 1656 1153.33C1669.07 1191.33 1682.4 1234.53 1689.47 1261.33C1691.87 1270.53 1694.13 1278.53 1694.67 1279.07C1695.6 1280.13 1712.67 1242.53 1722.4 1218C1735.6 1184.93 1751.47 1134.13 1759.87 1098.67C1762.93 1085.6 1772 1041.2 1772 1039.07C1772 1037.87 1769.47 1039.2 1763.33 1043.47Z"/>
        </g>
      </svg>

      <p
        style={{
          transition: "opacity 0.5s ease, transform 0.5s ease",
          opacity: done || !visible ? 0 : 1,
          transform: visible && !done ? "translateY(0)" : "translateY(3px)",
        }}
        className="text-sm text-black/50 dark:text-white/50 text-center max-w-xs"
      >
        {messages[index]}
      </p>
    </div>
  );
}