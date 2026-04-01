import { useSignedUrl } from "@/lib/storage";

interface SignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  bucket: string;
  storagePath: string | null | undefined;
}

const SignedImage = ({ bucket, storagePath, alt, ...props }: SignedImageProps) => {
  const signedUrl = useSignedUrl(bucket, storagePath);
  if (!signedUrl) return null;
  return <img src={signedUrl} alt={alt || ""} {...props} />;
};

export default SignedImage;
