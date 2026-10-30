import { downloadChatFile, uploadChatFile } from '../services/chatContent';
import { useEffect, useRef, useState } from 'react';
import { getSession } from '../services/api';
import { createConversation, chatHistory, sendChatMessage, markChatRead } from '../services/chatService';
import { PillButton, Icon } from './GoMatePortal';

const merge = (previous, items) => [...new Map([...previous,...items].map(item=>[item.id,item])).values()].sort((a,b)=>a.id.localeCompare(b.id));
export default function BusinessGroupChat({ group }) {
  const [conversation,setConversation] = useState(null), [messages,setMessages] = useState([]), [draft,setDraft] = useState(''), [error,setError] = useState('');
  const [loading,setLoading] = useState(true), [sending,setSending] = useState(false), [cursor,setCursor] = useState(null), [older,setOlder] = useState(false);
  const [attachment,setAttachment]=useState(null);
  const fileInput=useRef(null), shouldStick=useRef(true), scroller=useRef(null);
  const attempt = useRef(null), sendLock = useRef(false), bottom = useRef(null);
  useEffect(()=>{if(shouldStick.current&&scroller.current)scroller.current.scrollTop=scroller.current.scrollHeight;},[messages]);
  const userId = getSession()?.user.id;
  useEffect(()=>{
    let alive = true, timer, polling = false, firstPage = true, revoked = false;
    setConversation(null); setMessages([]); setError(''); setDraft(''); setLoading(true); setCursor(null); setAttachment(null); attempt.current=null;
    const refresh = async(id) => {
      if(polling || document.visibilityState==='hidden') return;
      polling=true;
      try { const page=await chatHistory(id); if(!alive)return; setMessages(current=>merge(current,page.items)); if(firstPage){setCursor(page.nextCursor);firstPage=false;}setError(''); const last=page.items[0]; if(last && document.hasFocus()) await markChatRead(id,last.id); }
      catch(reason) { if(alive){setError(reason.message);if([401,403,404].includes(reason.status)){revoked=true;setMessages([]);setConversation(null);clearInterval(timer);}} }
      finally {polling=false;}
    };
    void createConversation({type:'group',activityId:group.id}).then(async value=>{if(!alive)return;setConversation(value);await refresh(value.id);if(alive&&!revoked)timer=setInterval(()=>void refresh(value.id),3000);}).catch(reason=>{if(alive)setError(reason.message);}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;clearInterval(timer);};
  },[group.id]);
  const send = async event => {
    event.preventDefault(); if(sendLock.current || !conversation || !draft.trim()&&!attachment)return;
    shouldStick.current=true;sendLock.current=true;setSending(true);setError('');
    const text=draft.trim(); if(attempt.current?.text!==text || attempt.current?.file!==attachment)attempt.current={text,file:attachment,id:crypto.randomUUID()};
    try {if(attachment&&!attempt.current.uploaded)attempt.current.uploaded=await uploadChatFile(conversation.id,{uri:'',name:attachment.name,size:attachment.size,mimeType:attachment.type,file:attachment});const message=await sendChatMessage(conversation.id,text,attempt.current.id,attempt.current.uploaded?{attachmentIds:[attempt.current.uploaded.id]}:{});setMessages(current=>merge(current,[message]));setDraft('');setAttachment(null);if(fileInput.current)fileInput.current.value='';attempt.current=null;if(scroller.current)scroller.current.scrollTop=scroller.current.scrollHeight;}catch(reason){setError(reason.message);}finally{sendLock.current=false;setSending(false);}
  };
  const loadOlder=async()=>{if(!cursor||older||!conversation)return;shouldStick.current=false;setOlder(true);try{const page=await chatHistory(conversation.id,cursor);setMessages(current=>merge(current,page.items));setCursor(page.nextCursor);}catch(reason){setError(reason.message);}finally{setOlder(false);}};
  return <section className="gm-group-chat gm-panel" aria-label={'Chat nhóm '+group.name}><header><Icon name="chat" size={24}/><div><h3>Chat nhóm</h3><p>{group.campaignTitle} · {group.name}</p></div><span>{group.memberCount || 0} thành viên</span></header>{error&&<p role="alert" className="gm-form-error">{error}</p>}
    <div className="gm-chat-messages" ref={scroller} onScroll={event=>{const box=event.currentTarget;shouldStick.current=box.scrollHeight-box.scrollTop-box.clientHeight<70;}} role="log" aria-live="polite">{cursor&&<button type="button" className="gm-text-action" disabled={older} onClick={loadOlder}>{older?'Đang tải…':'Xem tin nhắn trước'}</button>}{loading?<p role="status">Đang tải cuộc trò chuyện…</p>:!messages.length?<p className="gm-chat-empty">Chưa có tin nhắn. Bắt đầu trao đổi với các thành viên tại đây.</p>:messages.map(message=><article key={message.id} className={'gm-chat-message '+(message.kind==='system'?'is-system':message.senderId===userId?'is-mine':'')}><strong>{message.kind==='system'?'Cập nhật nhóm':message.senderName}</strong><p>{message.text}</p>{message.attachments?.map(file=><button type="button" className="gm-text-action" key={file.id} onClick={()=>void downloadChatFile(conversation.id,file).catch(reason=>setError(reason.message))}><Icon name="upload" size={15}/>{file.name}</button>)}<time>{new Date(message.createdAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}</time></article>)}<div ref={bottom}/></div>
    {group.status==='cancelled'?<p className="gm-chat-empty">Nhóm đã thu hồi. Lịch sử chat chỉ có thể xem.</p>:<form onSubmit={send}><textarea aria-label="Tin nhắn nhóm" maxLength={4000} required={!attachment} placeholder="Nhập tin nhắn cho nhóm…" value={draft} onChange={event=>setDraft(event.target.value)} disabled={!conversation||sending}/><label className="gm-chat-attachment"><Icon name="upload"/><span>{attachment?.name || 'Đính kèm'}</span><input ref={fileInput} type="file" aria-label="Đính kèm tệp chat" disabled={!conversation||sending} onChange={event=>{const file=event.target.files?.[0];if(file?.size>10*1024*1024){setError('Mỗi tệp tối đa 10 MB.');event.target.value='';return;}setAttachment(file||null);}} /></label><PillButton type="submit" disabled={!conversation||sending||(!draft.trim()&&!attachment)} icon="arrow">{sending?'Đang gửi…':'Gửi tin nhắn'}</PillButton></form>}
  </section>;
}
