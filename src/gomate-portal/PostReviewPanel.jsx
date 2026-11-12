import { Icon, PillButton, StatusPill } from './GoMatePortal';
import PostLifecycleActions from './PostLifecycleActions';
import BusinessPostEditor from './BusinessPostEditor';

export default function PostReviewPanel({ posts, business, reviewing, busy, notes, onNoteChange, onResubmit, onWithdraw, onSave, onDecision, onPostLifecycle, t, formatDate, tone, statusLabel }) {
  return <section className="gm-panel gm-live-panel gm-review-posts-panel">
    <header className="gm-review-section-heading">
      <div><span className="gm-eyebrow">{t('Post moderation')}</span><h3>{t(business ? 'Bài đăng của tôi' : 'Duyệt bài đăng')}</h3></div>
      <span className="gm-review-post-count">{t(`${posts.length} posts`)}</span>
    </header>
    {!posts.length && <p className="gm-review-empty">{t('Chưa có bài đăng.')}</p>}
    {posts.map(row => <article className="gm-live-review gm-review-post" key={row.id}>
      <header className="gm-review-post-heading">
        <div className="gm-review-post-title">
          <span className="gm-review-post-kind">{t('Main post')}</span>
          <h4>{row.title}</h4>
          <span className="gm-review-business"><Icon name="business" size={15} />{row.businessName}</span>
        </div>
        <StatusPill tone={tone(row.status)}>{t(statusLabel[row.status])}</StatusPill>
      </header>

      <div className="gm-review-post-content">
        {row.copy && <p className="gm-review-description">{row.copy}</p>}
        {row.event && <div className="gm-review-metadata">
          <span><Icon name="activity" size={15} /><time dateTime={row.event.startsAt}>{formatDate(row.event.startsAt)}{row.event.endsAt ? ` – ${formatDate(row.event.endsAt)}` : ''}</time></span>
          {row.event.location && <span><Icon name="location" size={15} />{row.event.location}</span>}
          {row.event.maxParticipants && <span><Icon name="users" size={15} />{row.event.maxParticipants} {t('Attendees')}</span>}
        </div>}
        {(row.discountPercent || row.offer || row.discount || row.offerTerms) && <div className="gm-review-offer">
          <Icon name="tag" size={16} />
          <p>{row.discountPercent ? `${t('Discount')} ${row.discountPercent}%` : ''}{row.discountPercent && (row.offer || row.discount) ? ' · ' : ''}{row.offer || row.discount}{row.offerTerms ? ` · ${row.offerTerms}` : ''}</p>
        </div>}
        {row.reviewNote && <aside className="gm-review-note"><strong>{t('Review notes')}</strong><p>{row.reviewNote}</p></aside>}
      </div>

      {business && ['pending', 'rejected'].includes(row.status) && <div className="gm-review-owner-actions">
        <PillButton disabled={busy} onClick={() => onResubmit(row)}>{t('Resubmit for review')}</PillButton>
        <PillButton variant="secondary" disabled={busy} onClick={() => onWithdraw(row)}>{t('Withdraw post')}</PillButton>
      </div>}
      {business && <BusinessPostEditor post={row} busy={busy} onSave={onSave} />}

      {row.activityId && row.status === 'approved' && <a className="gm-review-app-link" href={`/#/app/home/activityDetail/${row.activityId}`}><Icon name="external" size={15} />{t('View event in app ↗')}</a>}

      {row.groups?.length > 0 && <section className="gm-review-groups" aria-label={t('Groups for this post')}>
        <header className="gm-review-groups-heading"><div><Icon name="users" size={17} /><h5>{t('Sub-groups')}</h5></div><span>{row.groups.length} {t('groups')}</span></header>
        <div className="gm-review-group-list">{row.groups.map(group => <article className="gm-post-group-row" key={group.activityId}>
          <div className="gm-review-group-info">
            <div className="gm-review-group-title"><h6>{group.name}</h6>
              {(group.state || row.status === 'approved') && <StatusPill tone={group.state === 'deleted' ? 'red' : group.state ? 'orange' : tone(row.status)}>{group.state === 'deleted' ? t('Deleted group') : group.state ? t('Withdrawn group') : t(statusLabel[row.status])}</StatusPill>}
            </div>
            <div className="gm-review-metadata gm-review-group-metadata"><span><Icon name="activity" size={15} /><time dateTime={group.event?.startsAt}>{formatDate(group.event?.startsAt)}</time></span>
              {group.event?.location && <span><Icon name="location" size={15} />{group.event.location}</span>}
              {row.status === 'approved' && !group.state && <a className="gm-review-app-link" href={'/#/app/home/activityDetail/' + group.activityId}><Icon name="external" size={15} />{t('View group in app')}</a>}
            </div>
          </div>
          <div className="gm-review-group-actions"><PostLifecycleActions post={row} group={group} busy={busy} onAction={onPostLifecycle} /></div>
        </article>)}</div>
      </section>}

      {reviewing && row.status === 'pending' && <div className="gm-review-moderation">
        <input aria-label={`${t('Review note')}: ${row.title}`} className="gm-simple-input" placeholder={t('Review notes')} value={notes[row.id] || ''} onChange={event => onNoteChange(row.id, event.target.value)} />
        <div className="gm-live-actions gm-review-post-actions">
          <PillButton disabled={busy} onClick={() => onDecision(row, 'approved')}>{t('Duyệt và đưa lên app')}</PillButton>
          <PillButton disabled={busy} variant="secondary" onClick={() => onDecision(row, 'rejected')}>{t('Từ chối bài')}</PillButton>
        </div>
      </div>}
      {(row.status === 'approved' || row.status === 'withdrawn') && <div className="gm-review-post-actions"><PostLifecycleActions post={row} busy={busy} onAction={onPostLifecycle} /></div>}
    </article>)}
  </section>;
}
