import { Field, FieldInput, FieldSelect, FieldTextarea } from 'padelmgt-design-system';

export function TextInput() {
  return (
    <Field label="Nombre">
      <FieldInput defaultValue="Luis González" placeholder="Tu nombre" />
    </Field>
  );
}

export function Select() {
  return (
    <Field label="Nivel">
      <FieldSelect defaultValue="3.5">
        <option value="2.5">2.5</option>
        <option value="3.0">3.0</option>
        <option value="3.5">3.5</option>
        <option value="4.0">4.0</option>
      </FieldSelect>
    </Field>
  );
}

export function Textarea() {
  return (
    <Field label="Descripción">
      <FieldTextarea rows={3} defaultValue="Jugador de nivel intermedio, disponible fines de semana." />
    </Field>
  );
}
