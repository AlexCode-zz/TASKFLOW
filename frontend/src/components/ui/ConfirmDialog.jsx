import Modal from './Modal';
import Button from './Button';

const ConfirmDialog = ({ open, title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }) => (
  <Modal
    open={open}
    title={title}
    onClose={onCancel}
    footer={
      <>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="state-message mb-0">{message}</p>
  </Modal>
);

export default ConfirmDialog;
