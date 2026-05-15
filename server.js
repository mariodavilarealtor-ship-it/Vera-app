     })
    });
    claudeData = await claudeRes.json();
  } catch(err) {
    return res.status(500).json({ error: "Claude fetch error: " + err.message });
  }

  if (claudeRes.status !== 200) {
    return res.status(500).json({ 
      error: "Claude API error", 
      status: claudeRes.status,
      detalle: claudeData 
    });
  }

  const texto = (claudeData.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  
  let perfil;
  try {
    perfil = JSON.parse(texto.replace(/```json|```/g, "").trim());
  } catch(err) {
    return res.status(500).json({ error: "JSON parse error", texto_recibido: texto.slice(0, 300) });
  }

  return res.status(200).json({ success: true, nombre, perfil });
};
