import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleProp, TextStyle, ViewStyle } from "react-native";

interface TabBarIconProps {
  name: React.ComponentProps<typeof MaterialIcons>["name"];
  focused: boolean;
  color: string;
  size?: number;
  style?: ViewStyle;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({
  name,
  focused,
  color,
  size = 24,
  style,
}) => {
  // For MaterialIcons, typically you'll pass the exact icon name depending on the focused state externally
  return (
    <MaterialIcons
      name={name}
      size={size}
      color={color}
      style={style as StyleProp<TextStyle>}
    />
  );
};

export default TabBarIcon;
