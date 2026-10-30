import { useFeedbackState } from '../services/feedback';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './LocalizedText';
import { FormField } from './FormField';
import { DateField, dateToIso, isoToDate, TimeField } from './DateTimeField';
import { ItineraryStep, pickPlanFile, PlanDraft } from '../services/planService';
import { colors } from '../theme';

export function TripPlanEditor({ value, onChange, startDate, endDate, startTime = '09:00', endTime = '18:00', onBusyChange }: { value: PlanDraft; onChange: (patch: Partial<PlanDraft>) => void; startDate: string; endDate: string; startTime?: string; endTime?: string; onBusyChange?: (busy: boolean) => void }) {
  const [expanded, setExpanded] = useState(''), [showDocs, setShowDocs] = useState(Boolean(value.planLink || value.planFile || value.planAttachment)), [error, setError] = useFeedbackState(''), [busy, setBusy] = useState(false);
  const fileLock = useRef(false);
  const multiDay = Boolean(endDate && endDate !== startDate);
  const patch = (id: string, fields: Partial<ItineraryStep>) => onChange({ itinerary: value.itinerary.map(step => step.id === id ? { ...step, ...fields } : step) });
  const add = () => {
    if (value.itinerary.length >= 60) return;
    const id = 'step-' + Date.now() + '-' + value.itinerary.length;
    onChange({ itinerary: [...value.itinerary, { id, date: dateToIso(startDate), time: startTime, title: '', place: '', note: '' }] });
    setExpanded(id);
  };
  const template = () => {
    const start = new Date(dateToIso(startDate) + 'T' + startTime + ':00+07:00'), end = new Date(dateToIso(endDate || startDate) + 'T' + endTime + ':00+07:00');
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) { setError('Chọn khoảng ngày và giờ trước khi tạo gợi ý.'); return; }
    let middle = new Date(dateToIso(startDate) + 'T14:00:00+07:00');
    if (middle <= start || middle >= end) middle = new Date(start.getTime() + Math.min(2 * 3600000, (end.getTime() - start.getTime()) / 2));
    const times = [start, middle, end];
    onChange({ itinerary: ['Tập trung và làm quen', 'Hoạt động chính', 'Kết thúc'].map((title, index) => {
      const local = new Date(times[index].getTime() + 7 * 3600000).toISOString();
      return { id: 'template-' + Date.now() + '-' + index, date: local.slice(0, 10), time: local.slice(11, 16), title, place: '', note: '' };
    }) });
    setError('');
  };
  const chooseFile = async () => {
    if (fileLock.current) return;
    fileLock.current = true; setBusy(true); onBusyChange?.(true); setError('');
    try { const file = await pickPlanFile(); if (file) onChange({ planAttachment: file }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không đọc được tệp'); }
    finally { fileLock.current = false; setBusy(false); onBusyChange?.(false); }
  };
  const fileName = value.planAttachment === null ? '' : value.planAttachment?.name || value.planFile?.name;
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>Lịch trình dự kiến</Text>
      {!value.itinerary.length && <Pressable accessibilityRole="button" onPress={template} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.primarySoft }}><Ionicons name="sparkles-outline" size={16} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Gợi ý nhanh 3 mốc</Text></Pressable>}
    </View>
    {value.itinerary.map((step, index) => <View key={step.id} style={{ padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 14, gap: 10, backgroundColor: colors.background }}>
      <Pressable accessibilityRole="button" accessibilityLabel={'Sửa mốc ' + (index + 1)} onPress={() => setExpanded(expanded === step.id ? '' : step.id)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700' }}>{index + 1}. {step.time} · {step.title || 'Mốc mới'}</Text>
          {(multiDay || step.place) ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{multiDay ? isoToDate(step.date) : ''}{multiDay && step.place ? ' · ' : ''}{step.place}</Text> : null}
        </View>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{expanded === step.id ? 'Thu gọn' : 'Sửa'}</Text>
      </Pressable>
      {expanded === step.id && <>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ width: 110 }}><TimeField label={'Giờ mốc ' + (index + 1)} value={step.time} onChange={time => patch(step.id, { time })} /></View>
          <View style={{ flex: 1 }}><FormField label={'Nội dung mốc ' + (index + 1)} value={step.title} onChangeText={title => patch(step.id, { title })} placeholder="Ví dụ: Tập trung, ăn trưa" /></View>
        </View>
        {multiDay && <DateField label={'Ngày mốc ' + (index + 1)} value={isoToDate(step.date)} onChange={date => patch(step.id, { date: dateToIso(date) })} allowPast />}
        <FormField label={'Địa điểm mốc ' + (index + 1)} value={step.place} onChangeText={place => patch(step.id, { place })} placeholder="Tùy chọn (ví dụ: sảnh chính)" />
        <FormField label={'Ghi chú mốc ' + (index + 1)} value={step.note} onChangeText={note => patch(step.id, { note })} placeholder="Ghi chú ngắn (tùy chọn)" />
        <Pressable accessibilityRole="button" accessibilityLabel={'Xóa mốc ' + (index + 1)} onPress={() => onChange({ itinerary: value.itinerary.filter(item => item.id !== step.id) })}><Text style={{ color: colors.danger, fontSize: 13 }}>Xóa mốc này</Text></Pressable>
      </>}
    </View>)}
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Pressable accessibilityRole="button" disabled={value.itinerary.length >= 60} onPress={add} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.primary }}><Text style={{ color: colors.white, fontWeight: '700' }}>+ Thêm mốc</Text></Pressable>
      {value.itinerary.length > 1 && <Pressable accessibilityRole="button" style={{ padding: 10 }} onPress={() => onChange({ itinerary: [...value.itinerary].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)) })}><Text style={{ color: colors.primary, fontWeight: '600' }}>Sắp theo giờ</Text></Pressable>}
      <Pressable accessibilityRole="button" style={{ padding: 10 }} onPress={() => setShowDocs(v => !v)}><Text style={{ color: colors.textSecondary, fontSize: 13 }}>{showDocs ? 'Ẩn tài liệu đính kèm −' : '+ Link / Excel đính kèm (tùy chọn)'}</Text></Pressable>
    </View>
    {showDocs && <View style={{ gap: 10, paddingTop: 6, borderTopWidth: 1, borderColor: colors.border }}>
      <FormField label="Link Google Sheets / kế hoạch online" value={value.planLink} onChangeText={planLink => onChange({ planLink })} placeholder="https://docs.google.com/spreadsheets/..." />
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void chooseFile()} style={{ padding: 14, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.primaryLight, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Ionicons name="document-attach-outline" size={22} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '700' }}>{busy ? 'Đang đọc tệp...' : fileName ? 'Đổi tệp Excel' : 'Đính kèm tệp Excel (.xlsx/.xls)'}</Text></Pressable>
      {fileName ? <View style={{ flexDirection: 'row', gap: 16 }}><Text style={{ flex: 1 }}>{fileName}</Text><Pressable accessibilityRole="button" onPress={() => onChange({ planAttachment: null })}><Text style={{ color: colors.danger }}>Bỏ tệp Excel</Text></Pressable></View> : null}
    </View>}
    {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
  </View>;
}
