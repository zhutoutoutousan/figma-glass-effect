<template>
  <div :class="className" :style="style">
    <canvas
      ref="canvasRef"
      :width="width"
      :height="height"
      :style="canvasStyle"
    />
    <div v-if="error" class="error">
      Error: {{ error }}
    </div>
    <div v-if="!isReady && !error" class="loading">
      Loading glass effects...
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { PhysicsGlass, PhysicsGlassConfig, GlassShape, BackgroundPattern } from 'physics-glass-effects';

export default defineComponent({
  name: 'GlassEffectComponent',
  props: {
    width: {
      type: Number,
      default: 800
    },
    height: {
      type: Number,
      default: 600
    },
    shape: {
      type: String as () => GlassShape,
      default: 'sphere'
    },
    backgroundPattern: {
      type: String as () => BackgroundPattern,
      default: 'stripes'
    },
    backgroundImage: {
      type: String,
      default: undefined
    },
    className: {
      type: String,
      default: undefined
    },
    style: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const glassInstance = ref<PhysicsGlass | null>(null);
    const isReady = ref(false);
    const error = ref<string | null>(null);

    const canvasStyle = computed(() => ({
      width: '100%',
      height: '100%',
      display: 'block',
      ...props.style
    }));

    const initializeGlass = () => {
      if (!canvasRef.value) return;

      const config: PhysicsGlassConfig = {
        shape: props.shape,
        backgroundPattern: props.backgroundPattern,
        backgroundTexture: props.backgroundImage,
        mouse: {
          enabled: true,
          followCursor: true
        },
        animation: {
          enabled: true,
          speed: 1.0,
          surfaceRipples: true
        },
        onReady: () => {
          isReady.value = true;
          error.value = null;
        },
        onError: (err) => {
          error.value = err.message;
          isReady.value = false;
        }
      };

      try {
        glassInstance.value = new PhysicsGlass(canvasRef.value, config);
      } catch (err) {
        error.value = (err as Error).message;
      }
    };

    const destroyGlass = () => {
      if (glassInstance.value) {
        glassInstance.value.destroy();
        glassInstance.value = null;
        isReady.value = false;
      }
    };

    const handleResize = () => {
      if (glassInstance.value) {
        glassInstance.value.resize();
      }
    };

    // Watch for prop changes
    watch(() => props.shape, (newShape) => {
      if (glassInstance.value && isReady.value) {
        glassInstance.value.setShape(newShape);
      }
    });

    watch(() => props.backgroundPattern, (newPattern) => {
      if (glassInstance.value && isReady.value) {
        glassInstance.value.setBackgroundPattern(newPattern);
      }
    });

    watch(() => props.backgroundImage, (newImage) => {
      if (glassInstance.value && isReady.value && newImage) {
        glassInstance.value.setBackgroundTexture(newImage);
      }
    });

    onMounted(() => {
      initializeGlass();
      window.addEventListener('resize', handleResize);
    });

    onUnmounted(() => {
      destroyGlass();
      window.removeEventListener('resize', handleResize);
    });

    return {
      canvasRef,
      isReady,
      error,
      canvasStyle,
      glassInstance
    };
  }
});
</script>

<style scoped>
.error {
  color: red;
  padding: 10px;
}

.loading {
  padding: 10px;
}
</style> 