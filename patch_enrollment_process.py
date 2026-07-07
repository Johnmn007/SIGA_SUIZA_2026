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

fetch_new = """    const fetchAcademic = async () => {
      try {
        const [pRes, peRes] = await Promise.all([
          apiClient.request('/api/mod-programas-estudio/programas').catch(()=>[]),
          apiClient.request('/api/mod-programas-estudio/periodos').catch(()=>[])
        ]);
        const fetchedPrograms = Array.isArray(pRes) ? pRes : [];
        const fetchedPeriods = Array.isArray(peRes) ? peRes : [];
        
        console.log("Academic Data Loaded:", {fetchedPrograms, fetchedPeriods, initialStudent});
        
        setPrograms(fetchedPrograms);
        setPeriods(fetchedPeriods);
        
        // Auto-select based on student and active period
        if (initialStudent) {
          const studentProgram = fetchedPrograms.find(p => p.id === initialStudent.programa_id || String(p.id) === String(initialStudent.programa_id));
          const activePeriod = fetchedPeriods.find(p => p.estado === 'ACTIVO') || fetchedPeriods[fetchedPeriods.length - 1];
          
          console.log("Auto-selecting:", {studentProgram, activePeriod});
          
          setSelection(prev => ({
            ...prev,
            program: studentProgram || fetchedPrograms[0] || null, // fallback if missing
            period: activePeriod || fetchedPeriods[0] || null
          }));
        }
      } catch (e) { 
        console.error('Error fetching academic data:', e); 
      }
    };
    fetchAcademic();
  }, [initialStudent]);"""

if fetch_old in content:
    content = content.replace(fetch_old, fetch_new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("EnrollmentProcess fetchAcademic patched successfully.")
else:
    print("Could not find fetch_old to replace.")
