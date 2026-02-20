import { before } from "@vendetta/patcher";
import { React, ReactNative } from "@vendetta/metro/common";
import { General } from "@vendetta/ui/components";
import settings from "./settings";

const { View, Animated, Dimensions } = ReactNative;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

let patches = [];
const persistentParticles = [];
let initialized = false;

const CONFETTI_COLORS = [
  "#ff4d4d",
  "#ffd93d",
  "#4dd2ff",
  "#6bffb0",
  "#ff66ff",
  "#ffffff"
];

function createParticle(index, startFromCurrent = false) {
  const startY = startFromCurrent ? Math.random() * SCREEN_HEIGHT : -10;
  const animValue = new Animated.Value(startY);

  const x = Math.random() * SCREEN_WIDTH;
  const size = 1.5 + Math.random() * 3;
  const duration = 3000 + Math.random() * 4000;
  const opacity = 0.7 + Math.random() * 0.3;
  const color =
    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  const drift = (Math.random() - 0.5) * 40;

  return {
    id: index,
    x,
    size,
    duration,
    animValue,
    startY,
    opacity,
    color,
    drift
  };
}

function startParticleAnimation(particle) {
  const animate = () => {
    particle.animValue.setValue(-10);

    Animated.timing(particle.animValue, {
      toValue: SCREEN_HEIGHT + 10,
      duration: particle.duration,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) animate();
    });
  };

  Animated.timing(particle.animValue, {
    toValue: SCREEN_HEIGHT + 10,
    duration:
      particle.duration *
      ((SCREEN_HEIGHT + 10 - particle.startY) / (SCREEN_HEIGHT + 20)),
    useNativeDriver: true
  }).start(({ finished }) => {
    if (finished) animate();
  });
}

function initializeParticles() {
  if (initialized) return;
  initialized = true;

  for (let i = 0; i < 140; i++) {
    const particle = createParticle(i, true);
    persistentParticles.push(particle);
    startParticleAnimation(particle);
  }
}

const ParticleItem = React.memo(({ particle }) => {
  const translateX = particle.animValue.interpolate({
    inputRange: [0, SCREEN_HEIGHT],
    outputRange: [0, particle.drift]
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: particle.x,
        top: 0,
        width: particle.size,
        height: particle.size,
        borderRadius: particle.size / 2,
        backgroundColor: particle.color,
        opacity: particle.opacity,
        transform: [{ translateY: particle.animValue }, { translateX }]
      }}
    />
  );
});

const FallingParticles = () => {
  React.useEffect(() => {
    initializeParticles();
  }, []);

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}
    >
      {persistentParticles.map((particle) => (
        <ParticleItem key={particle.id} particle={particle} />
      ))}
    </View>
  );
};

export default {
  onLoad: () => {
    initializeParticles();

    patches.push(
      before("render", General.View, (args) => {
        const [wrapper] = args;
        if (!wrapper || !Array.isArray(wrapper.style)) return;

        const hasFlexOne = wrapper.style.some((s) => s?.flex === 1);
        if (!hasFlexOne) return;

        let child = wrapper.children;

        if (Array.isArray(child)) {
          child = child.find((c) => c?.type?.name === "NativeStackViewInner");
        }

        if (child?.type?.name !== "NativeStackViewInner") return;

        const routes = child?.props?.state?.routeNames;
        if (!routes?.includes("main") || !routes?.includes("modal")) return;

        const currentChildren = Array.isArray(wrapper.children)
          ? wrapper.children
          : [wrapper.children];

        wrapper.children = [
          ...currentChildren,
          React.createElement(FallingParticles, {
            key: "persistent-confetti-overlay"
          })
        ];
      })
    );
  },

  onUnload: () => {
    for (const x of patches) x();
  },

  settings
};
