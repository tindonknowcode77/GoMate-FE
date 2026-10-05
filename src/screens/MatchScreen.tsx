import { useCallback, useMemo, useState } from 'react';
import { Animated, PanResponder, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityMatchCard, MatchActions, MatchHeader, MatchState } from '../components/match/MatchPrimitives';
import { MatchMoreMenu, NotInterestedSheet, ReportActivitySheet, SafetySheet, UndoSheet } from '../components/match/MatchSheets';
import { Activity, activities } from '../data/activities';
import { colors, layout } from '../theme';

type SheetName = 'more' | 'report' | 'safety' | 'undo' | 'notInterested' | null;

type MatchScreenProps = {
  activityItems?: Activity[];
  distanceLabel?: string;
  onRetry?: () => void;
  onFilterPress: () => void;
  onMatched: (activity: Activity) => void;
  onBack: () => void;
  state?: 'ready' | 'loading' | 'location-required' | 'network-error' | 'activity-unavailable';
};

export function MatchScreen({ activityItems = activities, onFilterPress, onMatched, onBack, distanceLabel, onRetry, state = 'ready' }: MatchScreenProps) {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastSkippedIndex, setLastSkippedIndex] = useState<number | null>(null);
  const [undoUsed, setUndoUsed] = useState(false);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [position] = useState(() => new Animated.ValueXY());
  const currentActivity = activityItems[currentIndex];
  const canUndo = lastSkippedIndex !== null && !undoUsed;

  const skipCurrent = useCallback(() => {
    setLastSkippedIndex(currentIndex);
    setCurrentIndex((current) => current + 1);
    setSheet(null);
  }, [currentIndex]);

  const swipe = useCallback((direction: 'left' | 'right') => {
    Animated.timing(position, {
      duration: 230,
      toValue: { x: direction === 'right' ? width * 1.25 : -width * 1.25, y: 4 },
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      if (direction === 'left') skipCurrent();
      else if (currentActivity) onMatched(currentActivity);
    });
  }, [currentActivity, onMatched, position, skipCurrent, width]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderMove: (_, gesture) => position.setValue({ x: gesture.dx, y: gesture.dy * 0.08 }),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 82) swipe('right');
      else if (gesture.dx < -82) swipe('left');
      else Animated.spring(position, { friction: 7, tension: 55, toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(position, { friction: 7, tension: 55, toValue: { x: 0, y: 0 }, useNativeDriver: true }).start(),
  }), [position, swipe]);

  const rotate = position.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-7deg', '0deg', '7deg'] });

  const undoSkip = () => {
    if (lastSkippedIndex === null || undoUsed) return;
    setCurrentIndex(lastSkippedIndex);
    setUndoUsed(true);
    setSheet(null);
  };

  if (state !== 'ready') {
    const states = {
      loading: { icon: 'calendar-outline' as const, title: 'Đang tìm hoạt động phù hợp', message: 'GoMate đang chuẩn bị những gợi ý tốt nhất cho bạn.', action: undefined },
      'location-required': { icon: 'location-outline' as const, title: 'Cần quyền truy cập vị trí', message: 'Bật vị trí để xem các hoạt động phù hợp đang diễn ra gần bạn.', action: 'Bật vị trí' },
      'network-error': { icon: 'cloud-offline-outline' as const, title: 'Không thể kết nối', message: 'Kiểm tra kết nối mạng và thử lại sau ít phút.', action: 'Thử lại' },
      'activity-unavailable': { icon: 'calendar-outline' as const, title: 'Hoạt động không còn khả dụng', message: 'Hoạt động có thể đã đủ thành viên, bị hủy hoặc được host đóng.', action: 'Xem hoạt động tiếp theo' },
    };
    const currentState = states[state];
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.page}><MatchHeader distance={distanceLabel} onBack={onBack} onFilter={onFilterPress} /><MatchState action={currentState.action} icon={currentState.icon} message={currentState.message} onAction={state === 'network-error' ? onRetry : currentState.action ? onFilterPress : undefined} title={currentState.title} /></View>
      </SafeAreaView>
    );
  }

  if (!currentActivity) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.page}>
          <MatchHeader distance={distanceLabel} onBack={onBack} onFilter={onFilterPress} />
          <MatchState action={canUndo ? 'Quay lại hoạt động vừa bỏ qua' : 'Điều chỉnh bộ lọc'} icon="calendar-outline" message="Hãy mở rộng khoảng cách, thời gian rảnh hoặc danh mục để tiếp tục Match." onAction={canUndo ? () => setSheet('undo') : onFilterPress} title="Không còn hoạt động phù hợp" />
        </View>
        <UndoSheet onCancel={() => setSheet(null)} onConfirm={undoSkip} visible={sheet === 'undo'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <MatchHeader distance={distanceLabel} onBack={onBack} onFilter={onFilterPress} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View {...panResponder.panHandlers} style={{ transform: [...position.getTranslateTransform(), { rotate }] }}>
            <ActivityMatchCard activity={currentActivity} canUndo={canUndo} onMore={() => setSheet('more')} onUndo={() => setSheet('undo')} />
          </Animated.View>
          <View style={styles.scrollSpacer} />
        </ScrollView>
        <MatchActions onInterested={() => swipe('right')} onSkip={() => swipe('left')} />
      </View>

      <MatchMoreMenu
        category={currentActivity.category}
        onClose={() => setSheet(null)}
        onHide={skipCurrent}
        onNotInterested={() => setSheet('notInterested')}
        onReport={() => setSheet('report')}
        onSafety={() => setSheet('safety')}
        visible={sheet === 'more'}
      />
      <ReportActivitySheet onClose={() => setSheet(null)} visible={sheet === 'report'} />
      <SafetySheet onClose={() => setSheet(null)} visible={sheet === 'safety'} />
      <UndoSheet onCancel={() => setSheet(null)} onConfirm={undoSkip} visible={sheet === 'undo'} />
      <NotInterestedSheet category={currentActivity.category} onCancel={() => setSheet(null)} onConfirm={skipCurrent} visible={sheet === 'notInterested'} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  page: { alignSelf: 'center', flex: 1, maxWidth: layout.maxWidth, width: '100%' },
  scrollContent: { paddingHorizontal: 14 },
  scrollSpacer: { height: 12 },
});
