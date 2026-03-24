import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useTheme } from "../context/ThemeContext";

const NoticeCard = ({ item, onPress }) => {
  const { theme } = useTheme();

  
  const isGlobal = item.tag === "Global" || !item.classId;
  const targetText = isGlobal
    ? "All Students"
    : `${item.classId} • ${item.subject || "General"}`;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.8}
      style={{
        backgroundColor: theme.bgSecondary,
        borderColor: theme.border,
      }}
      className="rounded-lg p-4 mb-3 border shadow-sm"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-row items-start flex-1 mr-2">
          <View
            style={{
              backgroundColor: theme.blackSoft60,
              borderColor: theme.accentSoft30,
            }}
            className="w-10 h-10 rounded-full overflow-hidden mr-3 items-center justify-center border"
          >
            {item.authorImage ? (
              <Image
                source={{ uri: item.authorImage }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Text style={{ color: theme.textDark }} className="font-bold">
                {item.author ? item.author.charAt(0).toUpperCase() : "A"}
              </Text>
            )}
          </View>

          <View className="flex-1">
            <Text
              style={{ color: theme.textPrimary }}
              className="text-base font-semibold"
              numberOfLines={1}
            >
              {item.title || "Notice"}
            </Text>

            <View className="flex-row mt-1 flex-wrap items-center">
              <Text
                className="text-[10px] font-extrabold mr-2 uppercase tracking-tighter"
                style={{
                  color: isGlobal ? theme.successBright : theme.infoBright,
                }}
              >
                {isGlobal ? "Global" : "Class Update"}
              </Text>
              <Text style={{ color: theme.textMuted }} className="text-[11px]">
                By: {item.author || "Admin"}
              </Text>
            </View>

            {!isGlobal && (
              <Text
                style={{ color: theme.accent }}
                className="text-[11px] font-bold mt-1"
              >
                {targetText}
              </Text>
            )}
          </View>
        </View>

        <Text style={{ color: theme.textSecondary }} className="text-[10px]">
          {item.date}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default NoticeCard;
