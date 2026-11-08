import Modal from '../ui/Modal';
import Button from '../ui/Button';
import AcademicItemList from './AcademicItemList';

const SubjectAcademicModal = ({ subject, open, onClose }) => {
  if (!subject) return null;

  return (
    <Modal
      open={open}
      title={`Parciales y laboratorios · ${subject.name}`}
      onClose={onClose}
      className="modal-lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <AcademicItemList subject={subject} />
    </Modal>
  );
};

export default SubjectAcademicModal;
