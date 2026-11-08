import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Activity } from '../data/activities';
import { Text } from './LocalizedText';
import { colors } from '../theme';

export function BusinessIdentity({ activity, details = false, showOffer = false }: { activity: Activity; details?: boolean; showOffer?: boolean }) {
  if (activity.organizerType !== 'business') return null;
  const business = activity.business;
  return <View style={[styles.wrap, details && styles.details]}>
    <View style={styles.row}><View style={styles.verified}><Ionicons name={business?.verified ? 'shield-checkmark' : 'business-outline'} color="#147D68" size={14} /><Text numberOfLines={1} style={styles.label}>{business?.verified ? 'Doanh nghiệp đã xác minh' : 'Doanh nghiệp tổ chức'}</Text></View>{details && <Text numberOfLines={1} style={styles.name}>{business?.name || activity.host}</Text>}{Boolean(business?.discountPercent) && <View style={styles.discount}><Text style={styles.discountText}>−{business!.discountPercent}%</Text></View>}</View>
    {((details || showOffer) && business?.offer || details && (Boolean(business?.depositAmount) || business?.terms)) ? <View style={styles.row}><Ionicons name="gift-outline" color="#147D68" size={16} /><Text numberOfLines={1} style={styles.offer}>{[(details || showOffer) && business?.offer ? business.offer : '', details && business?.depositAmount ? 'Tiền cọc / người: ' + business.depositAmount.toLocaleString('vi-VN') + ' VND · Liên hệ doanh nghiệp để được hướng dẫn.' : '', details && business?.terms ? business.terms : ''].filter(Boolean).join(' · ')}</Text></View> : null}
  </View>;
}
const styles = StyleSheet.create({ wrap: { gap: 6, marginBottom: 8 }, details: { marginTop: 12, borderWidth: 1, borderColor: '#B6DFD4', backgroundColor: '#EFFAF6', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 }, row: { flexDirection: 'row', gap: 8, alignItems: 'center' }, verified: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#E1F4EC' }, label: { color: '#147D68', fontSize: 10, fontWeight: '700' }, discount: { backgroundColor: '#147D68', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }, discountText: { color: colors.white, fontWeight: '800', fontSize: 12 }, name: { flex: 1, fontWeight: '800', fontSize: 14, color: '#125E50' }, offer: { flex: 1, fontSize: 12, lineHeight: 17, color: '#125E50' }, terms: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 } });
