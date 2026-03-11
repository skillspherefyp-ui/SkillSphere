import { IoAlbumsOutline, IoBookOutline, IoChatbubbleEllipsesOutline, IoHelpCircleOutline, IoSquareOutline } from 'react-icons/io5';
import { createIconComponent, resolveIconComponent } from './IconBase.web';

const materialMap = {
  'book-open-page-variant-outline': IoBookOutline,
  cards: IoAlbumsOutline,
  'chat-processing-outline': IoChatbubbleEllipsesOutline,
  'help-circle': IoHelpCircleOutline,
  presentation: IoBookOutline,
  'vector-square': IoSquareOutline,
};

const resolveMaterialIcon = (name) => materialMap[name] || resolveIconComponent(name);

export default createIconComponent(resolveMaterialIcon);
