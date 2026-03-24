import React, { createContext, useContext, useState } from "react";
import { useColorScheme } from "react-native";
import { colors } from "../utils/colors"; 
import { lightColors } from "../utils/lightColors"; 

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme(); 

  
  const [themeMode, setThemeMode] = useState("system");

  const isDark =
    themeMode === "system" ? systemScheme === "dark" : themeMode === "dark";

  const theme = isDark ? colors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, setThemeMode, themeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};


export const useTheme = () => useContext(ThemeContext);
