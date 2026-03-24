import React, { useState, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";


import {
  collection,
  getDocs,
  query,
  orderBy,
} from "@react-native-firebase/firestore";
import { db } from "../config/firebaseConfig";

const { width } = Dimensions.get("window");

const CAROUSEL_WIDTH = width - 32;

const BannerCarousel = () => {
  const { theme } = useTheme();

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const flatListRef = useRef(null);
  const timerRef = useRef(null);
  const currentIndexRef = useRef(0);

  
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        
        const q = query(
          collection(db, "banners"),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(q);

        const fetchedBanners = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setBanners(fetchedBanners);
      } catch (error) {
        console.error("Failed to fetch banners:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  
  const startAutoPlay = () => {
    stopAutoPlay(); 

    
    if (banners.length <= 1) return;

    timerRef.current = setInterval(() => {
      let nextIndex = currentIndexRef.current + 1;

      
      if (nextIndex >= banners.length) {
        nextIndex = 0;
      }

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });

      setCurrentIndex(nextIndex);
    }, 3000);
  };

  const stopAutoPlay = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  
  useEffect(() => {
    if (!loading && banners.length > 0) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [loading, banners.length]);

  
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  
  if (loading) {
    return (
      <View
        style={{
          width: CAROUSEL_WIDTH,
          height: 160,
          backgroundColor: theme.bgSecondary,
          borderColor: theme.border,
        }}
        className="mb-6 rounded-2xl border justify-center items-center"
      >
        <ActivityIndicator size="small" color={theme.accent} />
      </View>
    );
  }

  
  if (!banners || banners.length === 0) return null;

  return (
    <View className="mb-6">
      <FlatList
        ref={flatListRef}
        data={banners}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled 
        showsHorizontalScrollIndicator={false}
        bounces={false}
        
        onScrollBeginDrag={stopAutoPlay}
        onScrollEndDrag={startAutoPlay}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View
            style={{ width: CAROUSEL_WIDTH, height: 160 }}
            className="rounded-2xl overflow-hidden shadow-sm"
          >
            <Image
              
              source={{ uri: item.imageUrl || item.image }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
        )}
      />

      {banners.length > 1 && (
        <View className="flex-row justify-center items-center mt-3">
          {banners.map((_, index) => {
            const isActive = currentIndex === index;
            return (
              <View
                key={index}
                style={{
                  width: isActive ? 24 : 8,
                  height: 8,
                  backgroundColor: isActive ? theme.accent : theme.border,
                  borderRadius: 4,
                  marginHorizontal: 4,
                }}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

export default BannerCarousel;
