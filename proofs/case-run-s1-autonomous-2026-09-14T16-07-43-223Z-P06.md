# P06 — Trois marginales pour deux réalités quantiques

Score: 15.5 % (certificats 1/5, juge 11/100)

Certificats manqués: F0, coherence, F_phase, negativite_min

Le calcul numérique est trop lent. Je vais raisonner analytiquement sur la structure de ρ^{T_A} pour trouver la borne sharp.

<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="compute">
<｜｜DSML｜｜ parameter name="code" string="true">
import numpy as np
# Analyse analytique de N_{A|BC}.
# rho^{T_A}: transposition partielle sur A. 
# Structure: rho^{T_A} = [[rho^{00}, rho^{01}],[rho^{10}, rho^{11}]] en blocs 4x4 (indice A).
# ou rho^{ab} sont des blocs 4x4 (indices BC).
# rho^{T_A} = [[rho^{00}, rho^{10}],[rho^{01}, rho^{11}]] (transpose les blocs).
# Les marginales donnent rho^{00}+rho^{11} = rho_BC = diag(9/20,1/20,1/20,9/20).
# et rho^{00}+rho^{11}... non. Tr_A rho = rho_BC = rho^{00}+rho^{11}.
# Aussi rho_AB = Tr_C rho. 
# Pour minimiser N_{A|BC}, on veut rho^{T_A} PSD.
# rho^{T_A} PSD est equivalent a: pour tout |psi>=|a>|phi_BC>, <psi|rho^{T_A}|psi> >=0.
# = <a* phi|rho|a* phi> >=0 ou a* est conjugue... 
# En fait <psi|rho^{T_A}|psi> = <psi'|rho|psi'> avec psi' = (sigma_x a) phi? Non.
# Propriete: rho^{T_A} PSD <=> <phi_A psi_BC|rho|phi_A psi_BC> >=0 pour tout phi,psi? 
# Non, c'est rho PSD. rho^{T_A} PSD est le critere PPT.
# Pour un etat 3 qubits, PPT pour A|BC ne garantit pas separabilite mais est necessaire.
# Minimiser N_{A|BC}: on veut rho^{T_A} le plus PSD possible.
# Contrainte c=rho_07 fixe. rho_07 = <000|rho|111>.
# Dans rho^{T_A}, l'element [0,7] = rho_43 (calcule avant). 
# Mais rho_07 apparait dans rho^{T_A} a la position [1,6]? Verifions.
# rho^{T_A}[i,j] = rho[flipA(i), flipA(j)]. 
# [0,7]: flipA(0)=4, flipA(7)=3 -> rho[4,3]=rho_43.
# [1,6]: flipA(1)=5, flipA(6)=2 -> rho[5,2]=rho_52.
# [2,5]: flipA(2)=6, flipA(5)=1 -> rho[6,1]=rho_61.
# [3,4]: flipA(3)=7, flipA(4)=0 -> rho[7,0]=rho_70=c*.
# Donc c* apparait dans rho^{T_A}[3,4]! 
# rho^{T_A}[3,4] = rho_70 = c* = 3/10-i/10.
# Donc rho^{T_A} a un element hors-diag c* entre |011> et |100>.
# Cela peut creer des valeurs propres negatives.
print("rho^{T_A}[3,4]=c*=",3/10-1j/10)
# Les elements diagonaux de rho^{T_A}: [i,i]=rho[flipA(i),flipA(i)].
# [3,3]=rho_77, [4,4]=rho_00. Donc bloc [[rho_77, c*],[c, rho_00]] entre indices 3,4.
# PSD de ce bloc: rho_00 rho_77 >= |c|^2. |c|^2=1/10. rho_00 rho_77 <= (S/2)^2=(17/40)^2=289/1600≈0.1806.
# 1/10=0.1 < 0.1806, donc ce bloc peut etre PSD.
# Mais il y a d'autres contraintes.
print("|c|^2=",0.1,"(17/40)^2=",(17/40)**2)
</｜｜DSML｜｜ parameter>
</｜｜DSML｜｜ invoke>
</｜｜DSML｜｜ calls>
<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="compute">
<｜｜DSML｜｜ parameter name="code" string="true">
import numpy as np
# rho^{T_A} bloc indices 3,4: [[rho_77, c*],[c, rho_00]]. PSD: rho_00 rho_77>=|c|^2=1/10.
# rho_00+rho_77=17/20. min produit quand desequilibre. max produit=(17/40)^2=0.1806>0.1. OK.
# Mais rho^{T_A} a aussi d'autres elements. Cherchons la structure minimale.
# Essayons un etat candidat: rho00=rho77=17/40, c=3/10+i/10, et optimisons le reste.
# Calculons N_{A|BC} pour l'etat "uniforme" deja teste: 0.2912.
# Essayons de reduire en ajustant les coherences rho_34, rho_25, rho_16 etc.
# rho^{T_A} elements hors-diag reliant 3,4: c*. 
# Pour rendre rho^{T_A} PSD, il faut controler les autres blocs.
# Testons: rho avec seulement diag + c, calculons N.
def ptrace(rho,keep):
    r=rho.reshape([2]*6); drop=[q for q in range(3) if q not in keep][0]
    return np.trace(r,axis1=drop,axis2=drop+3).reshape(4,4)
def ptrans(rho,sub):
    r=rho.reshape([2]*6); r=np.swapaxes(r,sub,sub+3); return r.reshape(8,8)
def neg(rho,sub):
    w=np.linalg.eigvalsh(ptrans(rho,sub)); return (np.abs(w).sum()-1)/2
# Etat minimal: rho00=rho77=17/40, c=3/10+i/10, autres diag=1/40
rho=np.zeros((8,8),complex)
rho[0,0]=17/40; rho[7,7]=17/40; rho[0,7]=3/10+1j/10; rho[7,0]=3/10-1j/10
for i in [1,2,3,4,5,6]: rho[i,i]=1/40
print("N_A",neg(rho,0))
# valeurs propres de rho^{T_A}
w=np.linalg.eigvalsh(ptrans(rho,0)); print("eig rho^TA",np.round(w,5))
</｜｜DSML｜｜ parameter>
</｜｜DSML｜｜ invoke>
</｜｜DSML｜｜ calls>
<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="compute">
<｜｜DSML｜｜ parameter name="code" string="true">
import numpy as np
def ptrace(rho,keep):
    r=rho.reshape([2]*6); drop=[q for q in range(3) if q not in keep][0]
    return np.trace(r,axis1=drop,axis2=drop+3).reshape(4,4)
def ptrans(rho,sub):
    r=rho.reshape([2]*6); r=np.swapaxes(r,sub,sub+3); return r.reshape(8,8)
def neg(rho,sub):
    w=np.linalg.eigvalsh(ptrans(rho,sub)); return (np.abs(w).sum()-1)/2
# rho^{T_A} a une valeur propre negative. Identifions-la.
rho=np.zeros((8,8),complex)
rho[0,0]=17/40; rho[7,7]=17/40; rho[0,7]=3/10+1j/10; rho[7,0]=3/10-1j/10
for i in [1,2,3,4,5,6]: rho[i,i]=1/40
rt=ptrans(rho,0)
w,v=np.linalg.eigh(rt)
print("eig",np.round(w,5))
# La valeur propre negative vient du bloc 3,4: [[rho77,c*],[c,rho00]]=[[17/40,c*],[c,17/40]]
# eig = 17/40 +- |c| = 0.425 +- 0.3162 -> 0.7412, 0.1088. Positif!
# Donc la valeur negative vient d'ailleurs. Regardons.
print("bloc 3,4 eig:",17/40+abs(3/10+1j/10),17/40-abs(3/10+1j/10))
# min eig de rho^TA
print("min eig",w.min())
# Cherchons quel vecteur propre
idx=np.argmin(w); print("vecteur propre min:",np.round(v[:,idx],4))
</｜｜DSML｜｜ parameter>
</｜｜DSML｜｜ invoke>
</｜｜DSML｜｜ calls>