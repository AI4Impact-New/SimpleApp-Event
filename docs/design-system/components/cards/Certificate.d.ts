/** Cream-paper professional certificate mock (floating shadow). QR is a placeholder box. */
export interface CertificateProps {
  learner?: string;
  programme?: string;
  capstone?: string;
  assessment?: string;
  issued?: string;
  credentialId?: string;
  /** show "SAMPLE" mark, default true */
  sample?: boolean;
  style?: React.CSSProperties;
}
export declare function Certificate(props: CertificateProps): JSX.Element;
