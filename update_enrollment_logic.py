import re

path = "D:/SIGA/siga_frontend/src/modules/enrollment/EnrollmentProcess.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

fetch_old = """    const fetchAcademic = async () => {
      try {
        const [pRes, peRes] = await Promise.all([
          apiClient.callModule('mod-programas-estudio', 'programas'),
          apiClient.callModule('mod-programas-estudio', 'periodos')
        ]);
        setPrograms(Array.isArray(pRes) ? pRes : []);
        setPeriods(Array.isArray(peRes) ? peRes : []);
      } catch (e) { console.error(e); }
    };
    fetchAcademic();
  }, []);"""

fetch_new = """    const fetchAcademic = async () => {
      try {
        const [pRes, peRes] = await Promise.all([
          apiClient.callModule('mod-programas-estudio', 'programas'),
          apiClient.callModule('mod-programas-estudio', 'periodos')
        ]);
        const fetchedPrograms = Array.isArray(pRes) ? pRes : [];
        const fetchedPeriods = Array.isArray(peRes) ? peRes : [];
        
        setPrograms(fetchedPrograms);
        setPeriods(fetchedPeriods);
        
        // Auto-select based on student and active period
        if (initialStudent) {
          const studentProgram = fetchedPrograms.find(p => p.id === initialStudent.programa_id || p.id == initialStudent.programa_id);
          const activePeriod = fetchedPeriods.find(p => p.estado === 'ACTIVO') || fetchedPeriods[fetchedPeriods.length - 1];
          
          setSelection(prev => ({
            ...prev,
            program: studentProgram || null,
            period: activePeriod || null
          }));
        }
      } catch (e) { console.error(e); }
    };
    fetchAcademic();
  }, [initialStudent]);"""

if fetch_old in content:
    content = content.replace(fetch_old, fetch_new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("EnrollmentProcess fetchAcademic updated successfully.")
else:
    print("Could not find fetch_old to replace.")
