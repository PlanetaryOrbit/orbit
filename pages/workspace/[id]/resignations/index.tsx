import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const id = params?.id;
  if (!id || Array.isArray(id)) {
    return { notFound: true };
  }
  return {
    redirect: {
      destination: `/workspace/${encodeURIComponent(id)}/notices`,
      permanent: false,
    },
  };
};

export default function ResignationsRedirect() {
  return null;
}
