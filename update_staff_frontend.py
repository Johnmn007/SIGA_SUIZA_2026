import re

path = "D:/SIGA/siga_frontend/src/modules/admin/StaffManagement.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add editingId to state
content = content.replace(
    "const [showModal, setShowModal] = useState(false);",
    "const [showModal, setShowModal] = useState(false);\n  const [editingId, setEditingId] = useState(null);"
)

# 2. Add openEditModal function
edit_fn = """
  const openEditModal = (item) => {
    setEditingId(item.perfil.id);
    setFormData({
      email: item.usuario.email,
      full_name: item.usuario.full_name,
      password: '', // Leave blank unless changing
      condicion_laboral: item.perfil.condicion_laboral,
      numero_resolucion: item.perfil.numero_resolucion || '',
      fecha_fin_contrato: item.perfil.fecha_fin_contrato ? item.perfil.fecha_fin_contrato.split('T')[0] : '',
      cargo_funcional: item.perfil.cargo_funcional,
      profesion_titulo: item.perfil.profesion_titulo || '',
      programa_estudio_id: item.perfil.programa_estudio_id || ''
    });
    setShowModal(true);
  };
"""
content = content.replace("const handleInputChange = (e) => {", edit_fn + "\n  const handleInputChange = (e) => {")

# 3. Modify handleSubmit
submit_old = """    try {
      await apiClient.request('/api/mod-usuarios/personal', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      alert('Personal registrado exitosamente');"""

submit_new = """    try {
      if (editingId) {
        if (!payload.password) delete payload.password; // Don't send empty password
        await apiClient.request(`/api/mod-usuarios/personal/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        alert('Personal actualizado exitosamente');
      } else {
        await apiClient.request('/api/mod-usuarios/personal', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        alert('Personal registrado exitosamente');
      }"""
content = content.replace(submit_old, submit_new)

# Reset editingId on close/success
content = content.replace("setShowModal(false);", "setShowModal(false);\n      setEditingId(null);")
content = content.replace("onClick={() => setShowModal(false)}", "onClick={() => { setShowModal(false); setEditingId(null); }}")
content = content.replace("onClick={() => setShowModal(true)}", "onClick={() => { setShowModal(true); setEditingId(null); setFormData({ email: '', full_name: '', password: '', condicion_laboral: 'NOMBRADO_ESTADO', numero_resolucion: '', fecha_fin_contrato: '', cargo_funcional: 'DOCENTE_AULA', profesion_titulo: '', programa_estudio_id: '' }); }}")

# 4. Bind edit button
btn_old = """<button className="text-slate-400 hover:text-primary transition-colors p-2">"""
btn_new = """<button onClick={() => openEditModal(item)} className="text-slate-400 hover:text-primary transition-colors p-2" title="Editar">"""
content = content.replace(btn_old, btn_new)

# 5. Fix password required in edit mode
content = content.replace(
    'name="password"\n                        value={formData.password}\n                        onChange={handleInputChange}\n                        required',
    'name="password"\n                        value={formData.password}\n                        onChange={handleInputChange}\n                        required={!editingId}'
)
# Update modal title
content = content.replace(
    '<h3 className="text-lg font-bold text-slate-800">Registrar Personal (RRHH)</h3>',
    '<h3 className="text-lg font-bold text-slate-800">{editingId ? "Editar Personal (RRHH)" : "Registrar Personal (RRHH)"}</h3>'
)

# Update submit button text
content = content.replace(
    '<button type="submit" className="btn-primary" disabled={isSubmitting}>',
    '<button type="submit" className="btn-primary" disabled={isSubmitting}>\n                    {isSubmitting ? \'Guardando...\' : (editingId ? \'Guardar Cambios\' : \'Registrar Personal\')}'
)
content = content.replace(
    '{isSubmitting ? \'Registrando...\' : \'Registrar Personal\'}',
    '' # already replaced above
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("StaffManagement updated.")
