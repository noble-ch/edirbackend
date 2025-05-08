import { useParams } from 'react-router-dom';

export const useEdirSlug = () => {
  const { edirslug } = useParams();
  return edirslug;
};