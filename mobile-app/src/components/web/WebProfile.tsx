// Browser-only profile page (design: "Profile.dc.html"; loading/empty/error from "States.dc.html").
// Presentational: the profile load, sign-out and navigation stay in ProfileScreen; certificates and purchases
// reuse the same queries and download action as their own screens.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWebLayout } from '@/hooks/useWebLayout';
import { useMyCertificates } from '@/hooks/useLearning';
import { useMyPurchases } from '@/hooks/useBilling';
import { useCertificateDownload } from '@/hooks/useCertificateDownload';
import { Spinner } from '@/components/web/Spinner';
import { VerifyEmailNotice } from '@/components/VerifyEmailNotice';
import { apiErrorMessage } from '@/services/apiErrors';
import type { StoredUserData } from '@/services/auth';
import type { MyCertificate } from '@/types/learning';
import type { DemoOrder } from '@/types/billing';
import { colors, fonts, palette } from '@/theme/colors';
import { formatLocalDate } from '@/utils/datetime';
import { formatPaise } from '@/utils/money';
import { orderStatusDisplay } from '@/utils/billing';

type PressState = { pressed: boolean; hovered?: boolean };
type IconName = keyof typeof Ionicons.glyphMap;
type Tab = 'certs' | 'purchases' | 'account' | 'help';

const ink = palette.navy850;
const muted = palette.slate500;
const body = palette.slate600;
const line = palette.slate200;
const lineSoft = palette.slate150;

export interface WebProfileProps {
  user: StoredUserData | null;
  version: string;
  onLogout: () => void;
  onEditProfile: () => void;
  onVerifyCertificate?: (certificateId?: string) => void;
  onOpenOrder?: (orderId: string) => void;
  onPrivacyPolicy?: () => void;
  onAccessHelp: () => void;
  onSupport: () => void;
}

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'certs', label: 'Certificates', icon: 'ribbon-outline' },
  { id: 'purchases', label: 'Purchases', icon: 'receipt-outline' },
  { id: 'account', label: 'Account', icon: 'person-outline' },
  { id: 'help', label: 'Help & privacy', icon: 'help-buoy-outline' },
];

export function displayNameOf(user: StoredUserData | null) {
  return user?.name ?? ([user?.given_name, user?.family_name].filter(Boolean).join(' ').trim() || '');
}

function initialsOf(name: string, email?: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? email ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

export function WebProfile(props: WebProfileProps) {
  const { user } = props;
  const { wide } = useWebLayout();
  const [tab, setTab] = useState<Tab>('certs');
  const name = displayNameOf(user);

  const identity = (
    <View style={styles.identity}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsOf(name, user?.email)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.idName} numberOfLines={1}>
          {name || 'Your profile'}
        </Text>
        <Text style={styles.idEmail} numberOfLines={1}>
          {user?.email ?? ''}
        </Text>
      </View>
    </View>
  );

  const signOut = (
    <Pressable onPress={props.onLogout} accessibilityRole="button" style={(s: PressState) => [styles.tab, styles.signOut, s.hovered && styles.tabHover]}>
      <Ionicons name="log-out-outline" size={16} color={muted} />
      <Text style={[styles.tabText, { color: muted }]}>Sign out</Text>
    </Pressable>
  );

  const nav = wide ? (
    <View style={styles.aside}>
      {identity}
      <View style={{ gap: 2 }}>
        {TABS.map((t) => (
          <TabButton key={t.id} {...t} active={tab === t.id} onPress={() => setTab(t.id)} />
        ))}
        {signOut}
      </View>
    </View>
  ) : (
    <View style={{ gap: 16 }}>
      {identity}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TABS.map((t) => (
          <TabButton key={t.id} {...t} active={tab === t.id} onPress={() => setTab(t.id)} compact />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, wide && styles.pageContentWide]}>
      {nav}
      <View style={[styles.main, wide && styles.mainWide]}>
        {tab === 'certs' ? (
          <CertificatesPanel name={name} onVerify={props.onVerifyCertificate} wide={wide} />
        ) : tab === 'purchases' ? (
          <PurchasesPanel onOpenOrder={props.onOpenOrder} wide={wide} />
        ) : tab === 'account' ? (
          <AccountPanel {...props} name={name} />
        ) : (
          <HelpPanel {...props} />
        )}
        {!wide ? <View style={{ alignSelf: 'flex-start' }}>{signOut}</View> : null}
      </View>
    </ScrollView>
  );
}

function TabButton({ label, icon, active, onPress, compact }: { label: string; icon: IconName; active: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={(s: PressState) => [compact ? styles.chip : styles.tab, active ? styles.tabActive : s.hovered && styles.tabHover, compact && !active && styles.chipIdle]}
    >
      <Ionicons name={icon} size={16} color={active ? ink : body} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function PanelHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <View style={styles.panelHead}>
      <Text style={styles.h1} role="heading" aria-level={1}>
        {title}
      </Text>
      {children}
    </View>
  );
}

// ---- Certificates ----

function CertificatesPanel({ name, onVerify, wide }: { name: string; onVerify?: (id?: string) => void; wide: boolean }) {
  const { data: certificates = [], isLoading, error, refetch } = useMyCertificates();
  const { download, downloadingId } = useCertificateDownload();
  return (
    <>
      <PanelHead title="Certificates">
        {onVerify ? (
          <Pressable onPress={() => onVerify()} style={(s: PressState) => [styles.btnOutline, s.hovered && styles.btnOutlineHover]}>
            <Ionicons name="shield-checkmark-outline" size={15} color={ink} />
            <Text style={styles.btnOutlineText}>Verify a certificate</Text>
          </Pressable>
        ) : null}
      </PanelHead>
      {isLoading ? (
        <View style={styles.grid}>
          {[0, 1].map((k) => (
            <SkeletonCard key={k} />
          ))}
        </View>
      ) : error ? (
        <Blank icon="cloud-offline-outline" iconColor="#b4321f" title="Could not load certificates" body="Check your connection and try again." cta="Try again" onCta={() => refetch()} />
      ) : certificates.length === 0 ? (
        <Blank icon="ribbon-outline" title="No certificates yet" body="Complete a course to earn its certificate. It will appear here with a PDF and a verification ID." />
      ) : (
        <View style={styles.grid}>
          {certificates.map((c) => (
            <CertificateCard
              key={c.id}
              cert={c}
              name={c.recipient_name || name}
              busy={downloadingId === c.id}
              onDownload={() => download(c)}
              onVerify={onVerify ? () => onVerify(c.id) : undefined}
              wide={wide}
            />
          ))}
        </View>
      )}
    </>
  );
}

function CertificateCard({
  cert,
  name,
  busy,
  onDownload,
  onVerify,
  wide,
}: {
  cert: MyCertificate;
  name: string;
  busy: boolean;
  onDownload: () => void;
  onVerify?: () => void;
  wide: boolean;
}) {
  const revoked = !!cert.revoked_at;
  return (
    <View style={[styles.certCard, !wide && { flexBasis: '100%' }]}>
      <View style={styles.certStage}>
        <View style={[styles.certPaper, revoked && styles.certRevoked]}>
          <Text style={styles.certBrand}>AI4Impact</Text>
          <View>
            <Text style={styles.certKind}>{cert.provider || 'Professional certificate'}</Text>
            <Text style={styles.certTitle} numberOfLines={2}>
              {cert.course_title ?? 'Course certificate'}
            </Text>
            <Text style={styles.certAward}>
              {name ? `Awarded to ${name} · ` : ''}
              {formatLocalDate(cert.issued_at)}
            </Text>
          </View>
          <Text style={styles.certId} selectable>
            {cert.id}
          </Text>
        </View>
        {revoked ? (
          <View style={styles.revokedTag}>
            <Text style={styles.revokedText}>Revoked</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.certActions}>
        {!revoked ? (
          <Pressable
            onPress={onDownload}
            disabled={busy}
            accessibilityLabel={`Download ${cert.course_title ?? 'certificate'} PDF`}
            style={(s: PressState) => [styles.btnPrimary, styles.btnSm, (s.hovered || busy) && styles.btnPrimaryHover]}
          >
            {busy ? <Spinner label="Downloading" /> : <Ionicons name="download-outline" size={14} color="#ffffff" />}
            <Text style={styles.btnPrimaryTextSm}>PDF</Text>
          </Pressable>
        ) : null}
        {onVerify ? (
          <Pressable onPress={onVerify} style={(s: PressState) => [styles.btnOutline, s.hovered && styles.btnOutlineHover]}>
            <Ionicons name="shield-checkmark-outline" size={14} color={ink} />
            <Text style={styles.btnOutlineTextSm}>Verify</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ---- Purchases ----

function PurchasesPanel({ onOpenOrder, wide }: { onOpenOrder?: (id: string) => void; wide: boolean }) {
  const { data: orders = [], isLoading, error, refetch } = useMyPurchases();
  return (
    <>
      <PanelHead title="Purchases" />
      {isLoading ? (
        <SkeletonRows />
      ) : error ? (
        <Blank icon="cloud-offline-outline" iconColor="#b4321f" title="Could not load purchases" body={apiErrorMessage(error, 'Failed to load purchases')} cta="Try again" onCta={() => refetch()} />
      ) : orders.length === 0 ? (
        <Blank icon="receipt-outline" title="No purchases yet" body="Course orders you place will be listed here." />
      ) : (
        <>
          <View style={styles.card}>
            {wide ? (
              <View style={[styles.tr, styles.thead]}>
                <Text style={[styles.th, styles.colItem]}>Item</Text>
                <Text style={[styles.th, styles.colDate]}>Date</Text>
                <Text style={[styles.th, styles.colAmt]}>Amount</Text>
                <Text style={[styles.th, styles.colStatus]}>Status</Text>
                <View style={styles.colAction} />
              </View>
            ) : null}
            {orders.map((o, i) => (
              <OrderRow key={o.id} order={o} last={i === orders.length - 1} wide={wide} onOpen={onOpenOrder ? () => onOpenOrder(o.id) : undefined} />
            ))}
          </View>
          <Text style={styles.footnote}>Demo orders only. No money was collected.</Text>
        </>
      )}
    </>
  );
}

function OrderRow({ order, last, wide, onOpen }: { order: DemoOrder; last: boolean; wide: boolean; onOpen?: () => void }) {
  const status = orderStatusDisplay(order);
  const ref = `#${order.id.slice(0, 8).toUpperCase()}`;
  return (
    <Pressable
      onPress={onOpen}
      disabled={!onOpen}
      accessibilityRole="link"
      style={(s: PressState) => [wide ? styles.tr : styles.orderNarrow, !last && styles.rowDivider, onOpen && s.hovered && { backgroundColor: palette.slate50 }]}
    >
      <View style={wide ? styles.colItem : undefined}>
        <Text style={styles.orderItem} numberOfLines={2}>
          {order.course_title}
        </Text>
        <Text style={styles.orderRef}>{ref}</Text>
      </View>
      {wide ? (
        <>
          <Text style={[styles.td, styles.colDate]}>{formatLocalDate(order.created_at)}</Text>
          <Text style={[styles.amt, styles.colAmt]}>{formatPaise(order.total_paise)}</Text>
          <Text style={[styles.status, styles.colStatus, { color: status.color }]}>{status.label}</Text>
          <View style={[styles.colAction, styles.viewLink]}>
            {onOpen ? (
              <>
                <Text style={styles.viewText}>View</Text>
                <Ionicons name="chevron-forward" size={14} color={ink} />
              </>
            ) : null}
          </View>
        </>
      ) : (
        <View style={{ gap: 4, marginTop: 6 }}>
          <Text style={styles.td}>
            {formatLocalDate(order.created_at)} · <Text style={styles.amt}>{formatPaise(order.total_paise)}</Text>
          </Text>
          <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ---- Account ----

function AccountPanel(props: WebProfileProps & { name: string }) {
  const { user, name } = props;
  const type = user?.user_type === 'professional' ? 'Working professional' : user?.user_type === 'student' ? 'Student' : 'Not completed';
  const location = [user?.city, user?.state].filter(Boolean).join(', ');
  const fields: { label: string; value?: string | null }[] = [
    { label: 'Full name', value: name },
    { label: 'Email', value: user?.email },
    { label: 'Profile type', value: type },
    ...(user?.user_type === 'professional'
      ? [
          { label: 'Designation', value: user?.designation },
          { label: 'Company', value: user?.company },
        ]
      : user?.user_type === 'student'
        ? [
            { label: 'University', value: user?.university },
            { label: 'Course', value: user?.course },
            { label: 'Year of study', value: user?.year_of_study != null ? String(user.year_of_study) : null },
          ]
        : []),
    { label: 'City', value: location },
  ];
  return (
    <>
      <PanelHead title="Account">
        <Pressable onPress={props.onEditProfile} style={(s: PressState) => [styles.btnPrimary, s.hovered && styles.btnPrimaryHover]}>
          <Ionicons name="create-outline" size={15} color="#ffffff" />
          <Text style={styles.btnPrimaryText}>Edit profile</Text>
        </Pressable>
      </PanelHead>
      <VerifyEmailNotice />
      <View style={[styles.card, styles.fields]}>
        {fields.map((f) => (
          <View key={f.label} style={styles.field}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            <View style={styles.fieldBox}>
              <Text style={[styles.fieldValue, !f.value && { color: palette.slate400 }]} numberOfLines={1}>
                {f.value || 'Not added'}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.footnote}>
        {props.onPrivacyPolicy ? (
          <>
            Read how we handle your data in the{' '}
            <Text style={styles.inlineLink} onPress={props.onPrivacyPolicy} accessibilityRole="link">
              Privacy Policy
            </Text>
            .{' '}
          </>
        ) : null}
        AI4Impact v{props.version}
      </Text>
    </>
  );
}

// ---- Help ----

function HelpPanel(props: WebProfileProps) {
  const rows: { icon: IconName; label: string; sub: string; onPress?: () => void }[] = [
    { icon: 'hourglass-outline', label: 'Recording access windows', sub: 'How long each recorded lecture stays open', onPress: props.onAccessHelp },
    { icon: 'mail-outline', label: 'Contact support', sub: 'Email the team about your course or account', onPress: props.onSupport },
    { icon: 'shield-checkmark-outline', label: 'Verify a certificate', sub: 'Check a certificate ID issued by AI4Impact', onPress: props.onVerifyCertificate ? () => props.onVerifyCertificate!() : undefined },
    { icon: 'document-text-outline', label: 'Privacy Policy', sub: 'What we collect and how we use it', onPress: props.onPrivacyPolicy },
  ];
  return (
    <>
      <PanelHead title="Help & privacy" />
      <View style={styles.card}>
        {rows
          .filter((r) => r.onPress)
          .map((r, i, all) => (
            <Pressable key={r.label} onPress={r.onPress} style={(s: PressState) => [styles.helpRow, i < all.length - 1 && styles.rowDivider, s.hovered && { backgroundColor: palette.slate50 }]}>
              <View style={styles.helpIcon}>
                <Ionicons name={r.icon} size={16} color={body} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.helpLabel}>{r.label}</Text>
                <Text style={styles.helpSub}>{r.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.slate400} />
            </Pressable>
          ))}
      </View>
    </>
  );
}

// ---- Shared states ----

function Blank({ icon, iconColor = body, title, body: text, cta, onCta }: { icon: IconName; iconColor?: string; title: string; body: string; cta?: string; onCta?: () => void }) {
  return (
    <View style={styles.blank}>
      <View style={styles.blankIcon}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.blankTitle}>{title}</Text>
      <Text style={styles.blankBody}>{text}</Text>
      {cta && onCta ? (
        <Pressable onPress={onCta} style={(s: PressState) => [styles.btnPrimary, styles.btnSm, { marginTop: 6 }, s.hovered && styles.btnPrimaryHover]}>
          <Text style={styles.btnPrimaryTextSm}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function useShimmer() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(v, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v.interpolate({ inputRange: [0, 1], outputRange: [palette.slate150, '#eef1f5'] });
}

function Sk({ w, h, r = 6, color }: { w: number | `${number}%`; h: number; r?: number; color: Animated.AnimatedInterpolation<string> }) {
  return <Animated.View style={{ width: w, height: h, borderRadius: r, backgroundColor: color }} />;
}

function SkeletonCard() {
  const color = useShimmer();
  return (
    <View style={styles.certCard}>
      <View style={styles.certStage}>
        <Animated.View style={[styles.certPaper, { backgroundColor: color, borderWidth: 0 }]} />
      </View>
      <View style={styles.certActions}>
        <Sk w={72} h={32} r={8} color={color} />
        <Sk w={84} h={32} r={8} color={color} />
      </View>
    </View>
  );
}

function SkeletonRows() {
  const color = useShimmer();
  return (
    <View style={styles.card}>
      {[0, 1, 2].map((k) => (
        <View key={k} style={[styles.tr, k < 2 && styles.rowDivider]}>
          <View style={[styles.colItem, { gap: 8 }]}>
            <Sk w="70%" h={14} color={color} />
            <Sk w={80} h={10} color={color} />
          </View>
          <Sk w={90} h={12} color={color} />
        </View>
      ))}
    </View>
  );
}

/** Profile load placeholder: sidebar identity + certificate cards in their final shape. */
export function WebProfileSkeleton() {
  const { wide } = useWebLayout();
  const color = useShimmer();
  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, wide && styles.pageContentWide]} aria-busy>
      <View style={wide ? styles.aside : { gap: 16 }}>
        <View style={styles.identity}>
          <Sk w={48} h={48} r={12} color={color} />
          <View style={{ flex: 1, gap: 8 }}>
            <Sk w="70%" h={14} color={color} />
            <Sk w="90%" h={10} color={color} />
          </View>
        </View>
        {wide ? (
          <View style={{ gap: 10 }}>
            {[0, 1, 2, 3].map((k) => (
              <Sk key={k} w="100%" h={28} r={8} color={color} />
            ))}
          </View>
        ) : null}
      </View>
      <View style={[styles.main, wide && styles.mainWide]}>
        <Sk w={200} h={30} color={color} />
        <View style={styles.grid}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    </ScrollView>
  );
}

const text = { fontFamily: fonts.body };
const display = { fontFamily: fonts.display };
const mono = { fontFamily: fonts.mono };

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 16, paddingBottom: 96, gap: 24 },
  pageContentWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 40, paddingTop: 40 },

  aside: { width: 232, flexShrink: 0, gap: 20, position: 'sticky' as any, top: 24 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: palette.navy800, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...display, fontSize: 16, fontWeight: '600', color: '#ffffff' },
  idName: { ...text, fontSize: 15, fontWeight: '600', color: ink },
  idEmail: { ...text, marginTop: 2, fontSize: 13, color: muted },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 40, paddingHorizontal: 12, borderRadius: 8 },
  tabActive: { backgroundColor: lineSoft },
  tabHover: { backgroundColor: palette.slate100 },
  tabText: { ...text, fontSize: 14, fontWeight: '500', color: body },
  tabTextActive: { fontWeight: '600', color: ink },
  signOut: { marginTop: 8, borderTopWidth: 1, borderTopColor: line, borderRadius: 0, height: 48, paddingTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingHorizontal: 12, borderRadius: 8 },
  chipIdle: { borderWidth: 1, borderColor: line, backgroundColor: '#ffffff' },

  main: { gap: 24 },
  mainWide: { flex: 1, minWidth: 0 },
  panelHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  h1: { ...display, fontSize: 30, lineHeight: 33, fontWeight: '700', letterSpacing: -0.75, color: ink },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: lineSoft },
  footnote: { ...text, fontSize: 12, lineHeight: 19, color: muted, maxWidth: 760 },
  inlineLink: { color: colors.primary, fontWeight: '500', textDecorationLine: 'underline' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  certCard: { flexGrow: 1, flexBasis: 340, maxWidth: 520, backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, overflow: 'hidden' },
  certStage: { padding: 28, backgroundColor: palette.slate100, borderBottomWidth: 1, borderBottomColor: line },
  certPaper: {
    aspectRatio: 1.414,
    backgroundColor: '#fbf9f3',
    borderWidth: 1,
    borderColor: '#e4dfd3',
    borderRadius: 6,
    padding: 22,
    justifyContent: 'space-between',
    boxShadow: '0 18px 40px -20px rgba(8,19,40,0.35)',
  } as any,
  certRevoked: { opacity: 0.6, filter: 'grayscale(0.8)' } as any,
  certBrand: { ...display, fontSize: 13, fontWeight: '700', color: ink },
  certKind: { ...text, fontSize: 10, color: muted },
  certTitle: { ...display, marginTop: 4, fontSize: 19, lineHeight: 22, fontWeight: '700', color: ink },
  certAward: { ...text, marginTop: 8, fontSize: 11, color: body },
  certId: { ...mono, fontSize: 9, fontWeight: '500', color: muted },
  revokedTag: { position: 'absolute', top: 16, right: 16, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#fdecea', borderWidth: 1, borderColor: '#f1c0b8' },
  revokedText: { ...text, fontSize: 12, fontWeight: '600', color: '#b4321f' },
  certActions: { flexDirection: 'row', gap: 8, paddingVertical: 16, paddingHorizontal: 20 },

  tr: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 24 },
  thead: { paddingVertical: 12, backgroundColor: palette.slate50, borderBottomWidth: 1, borderBottomColor: line },
  th: { ...text, fontSize: 12, color: muted },
  colItem: { flex: 1, minWidth: 200 },
  colDate: { width: 120 },
  colAmt: { width: 120 },
  colStatus: { width: 170 },
  colAction: { width: 64 },
  td: { ...text, fontSize: 14, color: body },
  amt: { ...display, fontSize: 14, fontWeight: '600', color: ink },
  status: { ...text, fontSize: 13, fontWeight: '500' },
  orderNarrow: { paddingVertical: 16, paddingHorizontal: 20 },
  orderItem: { ...text, fontSize: 14, fontWeight: '500', color: ink },
  orderRef: { ...mono, marginTop: 3, fontSize: 12, fontWeight: '500', color: muted },
  viewLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  viewText: { ...text, fontSize: 13, fontWeight: '500', color: ink },

  fields: { padding: 28, flexDirection: 'row', flexWrap: 'wrap', gap: 20, maxWidth: 760 },
  field: { flexGrow: 1, flexBasis: 260, gap: 8 },
  fieldLabel: { ...text, fontSize: 13, fontWeight: '500', color: palette.slate700 },
  fieldBox: { height: 44, paddingHorizontal: 14, borderWidth: 1, borderColor: line, borderRadius: 10, justifyContent: 'center', backgroundColor: '#ffffff' },
  fieldValue: { ...text, fontSize: 14, color: ink },

  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 24 },
  helpIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' },
  helpLabel: { ...text, fontSize: 14, fontWeight: '500', color: ink },
  helpSub: { ...text, marginTop: 2, fontSize: 12, color: muted },

  blank: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: line, borderRadius: 20, paddingVertical: 40, paddingHorizontal: 28, alignItems: 'flex-start', gap: 12 },
  blankIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' },
  blankTitle: { ...display, marginTop: 4, fontSize: 17, fontWeight: '600', color: ink },
  blankBody: { ...text, fontSize: 14, lineHeight: 22, color: body },

  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 16, borderRadius: 8, backgroundColor: palette.navy800 },
  btnPrimaryHover: { backgroundColor: palette.navy700 },
  btnSm: { height: 36, paddingHorizontal: 14, gap: 6 },
  btnPrimaryText: { ...text, fontSize: 14, fontWeight: '600', color: '#ffffff' },
  btnPrimaryTextSm: { ...text, fontSize: 13, fontWeight: '600', color: '#ffffff' },
  btnOutline: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderWidth: 1, borderColor: line, borderRadius: 8, backgroundColor: '#ffffff' },
  btnOutlineHover: { borderColor: palette.slate300 },
  btnOutlineText: { ...text, fontSize: 14, fontWeight: '500', color: ink },
  btnOutlineTextSm: { ...text, fontSize: 13, fontWeight: '500', color: ink },
});
