import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './LocalizedText';
import { PickerSheet, WheelColumn } from './ProfilePickers';
import { colors } from '../theme';

export function dateToIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}
export function isoToDate(value: string) { const [year, month, day] = value.split('-'); return year && month && day ? `${day}/${month}/${year}` : ''; }
export function todayVietnam() { return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10); }

export function DateField({ label, value, onChange, allowPast = false }: { label: string; value: string; onChange: (value: string) => void; allowPast?: boolean }) {
  const [open, setOpen] = useState(false);
  const [today] = useState(todayVietnam);
  const [month, setMonth] = useState(() => (dateToIso(value) || todayVietnam()).slice(0, 7));
  const [year, monthNumber] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const move = (delta: number) => setMonth(new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7));
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={styles.control}>
      <Text style={!value ? styles.placeholder : undefined}>{value || 'Chọn ngày'}</Text>
      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
    </Pressable>
    <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}><View style={styles.backdrop}><View style={styles.modal}>
      <View style={styles.heading}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" onPress={() => move(-1)} style={styles.navBtn}><Ionicons name="chevron-back" size={18} color={colors.primary} /></Pressable>
        <Text style={styles.label}>Tháng {monthNumber}/{year}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" onPress={() => move(1)} style={styles.navBtn}><Ionicons name="chevron-forward" size={18} color={colors.primary} /></Pressable>
      </View>
      <View style={styles.grid}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <View key={day} style={styles.cell}><Text style={styles.weekday}>{day}</Text></View>)}</View>
      <View style={styles.grid}>{Array.from({ length: offset + count }, (_, index) => {
        const day = index - offset + 1;
        const iso = `${month}-${String(day).padStart(2, '0')}`;
        const disabled = day < 1 || (!allowPast && iso < today);
        return <Pressable key={index} accessibilityLabel={day > 0 ? isoToDate(iso) : undefined} accessibilityRole="button" disabled={disabled} style={[styles.cell, dateToIso(value) === iso && styles.selected]} onPress={() => { onChange(isoToDate(iso)); setOpen(false); }}><Text style={{ opacity: disabled ? 0.3 : 1, fontWeight: dateToIso(value) === iso ? '700' : '500', color: dateToIso(value) === iso ? colors.primary : colors.text }}>{day > 0 ? day : ''}</Text></Pressable>;
      })}</View>
      <View style={styles.footerRow}>
        <Pressable accessibilityRole="button" onPress={() => { onChange(''); setOpen(false); }} style={styles.btnSecondary}><Text style={styles.btnSecondaryText}>Xóa ngày</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>Đóng</Text></Pressable>
      </View>
    </View></View></Modal>
  </View>;
}

export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false), [hour, setHour] = useState('09'), [minute, setMinute] = useState('00');
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { const parts = /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value.split(':') : ['09', '00']; setHour(parts[0]); setMinute(parts[1]); setOpen(true); }} style={styles.control}>
      <Text style={!value ? styles.placeholder : undefined}>{value || 'Chọn giờ'}</Text>
      <Ionicons name="time-outline" size={18} color={colors.primary} />
    </Pressable>
    {open && <PickerSheet title={label} onClose={() => setOpen(false)}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <WheelColumn label="Giờ" options={Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))} value={hour} onChange={setHour} />
        <WheelColumn label="Phút" options={Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))} value={minute} onChange={setMinute} />
      </View>
      <View style={styles.footerRow}>
        <Pressable accessibilityRole="button" onPress={() => { onChange(''); setOpen(false); }} style={styles.btnSecondary}><Text style={styles.btnSecondaryText}>Xóa giờ</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => { onChange(`${hour}:${minute}`); setOpen(false); }} style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>Xác nhận</Text></Pressable>
      </View>
    </PickerSheet>}
  </View>;
}

export function DateRangeField({ label = 'Ngày bắt đầu và kết thúc', start, end, onChange, allowPast = false }: { label?: string; start: string; end: string; onChange: (start: string, end: string) => void; allowPast?: boolean }) {
  const [open, setOpen] = useState(false), [today] = useState(todayVietnam), [month, setMonth] = useState(todayVietnam().slice(0, 7));
  const [range, setRange] = useState({ start: '', end: '' }), [phase, setPhase] = useState<'start' | 'end'>('start'), [jump, setJump] = useState(false);
  const [year, monthNumber] = month.split('-').map(Number), count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate(), offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const move = (delta: number) => setMonth(new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7));
  const choose = (date: string) => { if (phase === 'start' || !range.start || date < range.start) { setRange({ start: date, end: '' }); setPhase('end'); } else { setRange(current => ({ ...current, end: date })); setPhase('start'); } };
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={styles.control} onPress={() => { setRange({ start: dateToIso(start), end: dateToIso(end || start) }); setMonth((dateToIso(start) || today).slice(0, 7)); setPhase('start'); setJump(false); setOpen(true); }}>
      <Text style={!start ? styles.placeholder : undefined}>{start ? `${start} – ${end || start}` : 'Chọn khoảng ngày'}</Text>
      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
    </Pressable>
    <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}><View style={styles.backdrop}><View style={styles.modal}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.heading}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" onPress={() => move(-1)} style={styles.navBtn}><Ionicons name="chevron-back" size={18} color={colors.primary} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Chọn tháng và năm" onPress={() => setJump(!jump)} style={styles.monthPill}><Text style={styles.label}>Tháng {monthNumber}/{year}</Text><Ionicons name={jump ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textSecondary} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" onPress={() => move(1)} style={styles.navBtn}><Ionicons name="chevron-forward" size={18} color={colors.primary} /></Pressable>
      </View>
      {jump ? <>
        <View style={{ flexDirection: 'row' }}>
          <WheelColumn label="Tháng" options={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))} value={String(monthNumber).padStart(2, '0')} onChange={value => setMonth(`${year}-${value}`)} />
          <WheelColumn label="Năm" options={Array.from({ length: 201 }, (_, i) => String(1900 + i))} value={String(year)} onChange={value => setMonth(`${value}-${String(monthNumber).padStart(2, '0')}`)} />
        </View>
        <Pressable accessibilityRole="button" onPress={() => setJump(false)} style={styles.btnSoft}><Text style={styles.btnSoftText}>Xem lịch</Text></Pressable>
      </> : <>
        <View style={styles.grid}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <View key={day} style={styles.cell}><Text style={styles.weekday}>{day}</Text></View>)}</View>
        <View style={styles.grid}>{Array.from({ length: offset + count }, (_, index) => { const day = index - offset + 1, iso = `${month}-${String(day).padStart(2, '0')}`, disabled = day < 1 || (!allowPast && iso < today), selected = iso === range.start || iso === range.end, between = iso > range.start && iso < range.end; return <Pressable key={index} accessibilityRole="button" accessibilityLabel={day > 0 ? isoToDate(iso) : undefined} accessibilityState={{ selected }} disabled={disabled} onPress={() => choose(iso)} style={[styles.cell, between && { backgroundColor: colors.background }, selected && styles.selected]}><Text style={{ opacity: disabled ? 0.25 : 1, fontWeight: selected ? '700' : '400', color: selected ? colors.primary : colors.text }}>{day > 0 ? day : ''}</Text></Pressable>; })}</View>
      </>}
      <View style={styles.rangePill}><Text style={styles.rangeText}>{range.start ? isoToDate(range.start) : 'Từ ngày'} – {range.end ? isoToDate(range.end) : 'Đến ngày'}</Text></View>
      <View style={styles.footerRow}>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.btnSecondary}><Text style={styles.btnSecondaryText}>Đóng</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={!range.start || !range.end} onPress={() => { onChange(isoToDate(range.start), isoToDate(range.end)); setOpen(false); }} style={[styles.btnPrimary, (!range.start || !range.end) && { opacity: 0.45 }]}><Text style={styles.btnPrimaryText}>Áp dụng</Text></Pressable>
      </View>
    </View></View></Modal>
  </View>;
}

export function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [date = '', time = '18:00'] = value.split(' · ');
  return <View style={styles.field}><DateField label={label} value={date} onChange={next => onChange(next ? `${next} · ${time}` : '')} />{date ? <TimeField label="Giờ" value={time} onChange={next => onChange(`${date} · ${next || '18:00'}`)} /> : null}</View>;
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { color: colors.text, fontWeight: '600', fontSize: 14 },
  control: { paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  placeholder: { color: colors.textMuted },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 },
  modal: { alignSelf: 'center', width: '100%', maxWidth: 440, padding: 18, borderRadius: 22, backgroundColor: colors.surface, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  navBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  monthPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.background },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  cell: { width: '14.28%', height: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  selected: { backgroundColor: colors.primarySoft },
  rangePill: { alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: colors.background },
  rangeText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnPrimary: { flex: 1, height: 42, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: colors.white, fontSize: 13.5, fontWeight: '700' },
  btnSecondary: { flex: 1, height: 42, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { color: colors.textSecondary, fontSize: 13.5, fontWeight: '600' },
  btnSoft: { height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  btnSoftText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
});
