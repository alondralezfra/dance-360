import { Button, type ButtonProps } from './Button'
import { Icon, type IconName } from './Icon'

interface IconButtonProps extends Omit<ButtonProps, 'children' | 'size' | 'aria-label'> {
  icon: IconName
  /** What the button does. Required: an icon alone has no accessible name. Also its tooltip unless `title` is given. */
  label: string
}

/** A square icon-only button (remove, previous/next, show/hide...). */
export function IconButton({ icon, label, title, ...props }: IconButtonProps) {
  return (
    <Button size="icon" aria-label={label} title={title ?? label} {...props}>
      <Icon name={icon} />
    </Button>
  )
}
