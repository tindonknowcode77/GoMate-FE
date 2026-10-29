import { usePortalText } from './usePortalText';
import { useEffect, useState } from 'react';
import { ActivityMap } from '../components/ActivityMap';
import { placePredictions, placeDetails, placeRegionFields, newPlacesSession } from '../services/mapsService';
import { Icon, PillButton } from './GoMatePortal';

const fieldStyle = 'gm-simple-input';

const emptyLocation = () => ({ id: '', name: '', address: '', city: 'Ho Chi Minh City', phone: '', latitude: '', longitude: '', mapX: 52, mapY: 46 });

export const initialBusinessLocations = [
  { id: 'loc-luma-d1', name: 'Luma Social Club - District 1', address: '15 Nguyen Hue, Ben Nghe Ward', city: 'Ho Chi Minh City', phone: '+84 28 3822 4100', latitude: 10.7739, longitude: 106.7033, mapX: 54, mapY: 43 },
  { id: 'loc-luma-thao-dien', name: 'Luma Social Club - Thao Dien', address: '12 Thao Dien Street, Thao Dien Ward', city: 'Ho Chi Minh City', phone: '+84 28 3744 8020', latitude: 10.8031, longitude: 106.734, mapX: 73, mapY: 28 },
];

export function useMapAPI() {
  const [query,setQuery]=useState(''), [results,setResults]=useState([]), [pinnedPlace,setPinnedPlace]=useState(null), [error,setError]=useState('');
  const [token]=useState(newPlacesSession);
  useEffect(()=>{let alive=true;const timer=setTimeout(()=>{if(query.trim().length<2){setResults([]);return;}void placePredictions(query.trim(),token).then(rows=>{if(alive){setResults(rows);setError('');}}).catch(()=>{if(alive){setResults([]);setError('Chưa tìm được địa điểm. Bạn có thể nhập địa chỉ và tọa độ bên dưới.');}});},300);return()=>{alive=false;clearTimeout(timer);};},[query,token]);
  const resolve=async prediction=>{try{const place=await placeDetails(prediction,token);const region=placeRegionFields(place,'');const result={id:place.id,name:place.title,address:place.address,city:region.province,latitude:place.point.latitude,longitude:place.point.longitude};setPinnedPlace(result);setQuery('');setResults([]);return result;}catch{setError('Chưa tải được địa điểm. Vui lòng thử lại hoặc nhập tọa độ.');return null;}};
  return {query,search:setQuery,results,pinnedPlace,pin:setPinnedPlace,resolve,error};
}

function Field({ label, children }) {
  const t = usePortalText();
  return <label className="gm-field"><span>{t(label)}</span>{children}</label>;
}

export default function LocationLibrary({ locations, onSave, onDelete }) {
  const t = usePortalText();
  const [form, setForm] = useState(emptyLocation);
  const [message, setMessage] = useState('');
  const mapAPI = useMapAPI();

  const patch = key => event => setForm(value => ({ ...value, [key]: event.target.value }));
  const selectPlace = async prediction => {
    const place = await mapAPI.resolve(prediction); if(!place) return;
    mapAPI.pin(place);
    setForm(value => ({ ...value, address: place.address, city: place.city, latitude: place.latitude, longitude: place.longitude, mapX: place.mapX, mapY: place.mapY }));
    setMessage('');
  };
  const editLocation = location => {
    setForm({ ...emptyLocation(), ...location });
    mapAPI.pin(location);
    setMessage('');
  };
  const reset = ({ clearMessage = true } = {}) => {
    setForm(emptyLocation());
    mapAPI.pin(null);
    mapAPI.search('');
    if (clearMessage) setMessage('');
  };
  const submit = async event => {
    event.preventDefault();
    if(form.latitude===''||form.longitude===''){setMessage('Chọn điểm trên bản đồ hoặc nhập vĩ độ và kinh độ.');return;}
    const isEditing = Boolean(form.id);
    const location = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) };
    if (await onSave(location) === false) return;
    reset({ clearMessage: false });
    setMessage(isEditing ? 'Location updated.' : 'Location added to the library.');
  };

  return (
    <div className="gm-location-library mx-auto w-full max-w-7xl">
      <div className="gm-location-toolbar">
        <div><span className="gm-eyebrow">{t("BUSINESS LOCATIONS")}</span><h3>{t("Saved locations ")}<span>{t(locations.length)}</span></h3></div>
        <PillButton icon="plus" onClick={reset}>{t("Add location")}</PillButton>
      </div>
      <div className="gm-location-layout">
        <section className="gm-panel gm-live-panel gm-location-editor">
          <div className="gm-panel-heading"><div><h3>{t(form.id ? 'Edit location' : 'New location')}</h3><p className="gm-live-muted">{t("Branch details")}</p></div></div>
          <form className="gm-auth-form" onSubmit={submit}>
            <Field label={t("Location name")}><input className={fieldStyle} value={form.name} required maxLength={120} onChange={patch('name')} placeholder={t("e.g. Luma Social Club - District 1")} /></Field>
            <Field label={t("Search address")}>
              <div className="gm-map-search"><Icon name="search" size={16} /><input value={mapAPI.query} onChange={event => mapAPI.search(event.target.value)} placeholder={t("Search a place or address")} autoComplete="off" /></div>
              {mapAPI.results.length > 0 && <div className="gm-map-results" role="listbox">{mapAPI.results.map(place => <button key={place.id} type="button" role="option" onClick={() => selectPlace(place)}><strong>{place.title || place.name}</strong><span>{place.subtitle || place.address} {t(" · ")}{t(place.city)}</span></button>)}</div>}
            </Field>
            <Field label={t("Detailed address")}><textarea aria-label={t("Địa chỉ chi tiết")} className={fieldStyle + ' gm-textarea'} value={form.address} required maxLength={300} onChange={patch('address')} placeholder={t("Street, ward, district, city")} /></Field>
            <div className="gm-field-grid">
              <Field label={t("City")}><input className={fieldStyle} value={form.city} required maxLength={100} onChange={patch('city')} /></Field>
              <Field label={t("Contact phone")}><input className={fieldStyle} type="tel" value={form.phone} onChange={patch('phone')} /></Field>
            </div>
            <div className="gm-field-grid"><Field label="Vĩ độ"><input className={fieldStyle} type="number" step="any" min={-90} max={90} required value={form.latitude} onChange={patch('latitude')} /></Field><Field label="Kinh độ"><input className={fieldStyle} type="number" step="any" min={-180} max={180} required value={form.longitude} onChange={patch('longitude')} /></Field></div>{mapAPI.error && <p role="status">{mapAPI.error}</p>}
            <div className="gm-location-coordinates"><span>{t(mapAPI.pinnedPlace ? 'Pinned coordinates' : 'Map pin')}</span><strong>{t(form.latitude ? `${Number(form.latitude).toFixed(4)}, ${Number(form.longitude).toFixed(4)}` : 'Select a search result or pin the map')}</strong></div>
            <div className="gm-location-form-actions"><PillButton type="submit" icon={form.id ? 'check' : 'plus'}>{t(form.id ? 'Save changes' : 'Add location')}</PillButton>{form.id && <button type="button" className="gm-text-action" onClick={reset}>{t("Cancel edit")}</button>}</div>
            {message && <p className="gm-location-message" role="status">{t(message)}</p>}
          </form>
        </section>

        <section className="gm-panel gm-live-panel gm-location-map-panel">
          <div className="gm-panel-heading"><div><span className="gm-eyebrow">{t("MAP")}</span><h3>{t("Location pin")}</h3></div><span className="gm-map-provider">{t("Bản đồ địa điểm")}</span></div>
          <ActivityMap editable point={{latitude:form.latitude!==''?Number(form.latitude):10.77,longitude:form.longitude!==''?Number(form.longitude):106.7}} onChange={point=>{mapAPI.pin(point);setForm(current=>({...current,latitude:point.latitude,longitude:point.longitude}));}} />
          <div className="gm-map-caption"><span className="gm-map-legend gm-map-legend--saved" />{t("Saved locations ")}<span className="gm-map-legend gm-map-legend--active" />{t("Current pin")}</div>
          <div className="gm-location-list-heading"><h3>{t("Location library")}</h3><span>{t(locations.length)} {t(" branches")}</span></div>
          <div className="gm-location-list">{locations.length ? locations.map(location => <article className="gm-location-row" key={location.id}>
            <div className="gm-location-row-pin" aria-hidden="true">{t(String(location.name).slice(0, 1).toUpperCase())}</div>
            <div className="gm-location-row-copy"><strong>{location.name}</strong><span>{location.address}, {t(location.city)}</span>{location.phone && <small>{t(location.phone)}</small>}</div>
            <button type="button" className="gm-text-action" onClick={() => editLocation(location)}>{t("Edit")}</button>
            <button type="button" className="gm-text-action gm-delete-action" onClick={() => onDelete(location.id)} aria-label={t(`Delete ${location.name}`)} title={t("Delete location")}><Icon name="close" size={15} /></button>
          </article>) : <p className="gm-location-empty">{t("No saved locations yet.")}</p>}</div>
        </section>
      </div>
    </div>
  );
}
