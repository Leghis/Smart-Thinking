# P03 — L’effet positif aux conséquences négatives

Score: 70.0 % (certificats 2/5, juge 100/100)

Certificats manqués: ATE, LATE_5pct_defiants, types_certifies

<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="compute">
<｜｜DSML｜｜ parameter name="code" string="true">
from fractions import Fraction as F
# A d=0: LATE in [3/40, 3/8]. Mais LP global dit [2/9, 4/9]. 
# 2/9=0.2222, 3/40=0.075. 4/9=0.4444, 3/8=0.375.
# Le LP global a un min plus grand (2/9>3/40) et un max plus grand (4/9>3/8).
# Cela signifie que le min global est atteint a d>0. Verifions.
# A d=1/20: num in [-0.04,0.33], LATE in [-0.0889,0.7333]. 
# Mais contraintes de coherence: P(NT,Y1=1)=P(NT,Y0=1) (NT), P(AT,Y1=1)=P(AT,Y0=1) (AT).
# A d=1/20: P(NT)=0.25, P(AT)=0.25.
# P(NT,Y1=1)=P(D1=0,Y1=1)-P(Def,Y1=1)=3/25-P(Def,Y1=1). P(Def,Y1=1) in [0,0.05].
# Donc P(NT,Y1=1) in [3/25-0.05, 3/25]=[0.07,0.12]. P(NT,Y0=1)=P(NT,Y1=1) in [0.07,0.12].
# P(AT,Y0=1)=P(D0=1,Y0=1)-P(Def,Y0=1)=9/50-P(Def,Y0=1). P(Def,Y0=1) in [0,0.05].
# P(AT,Y0=1) in [9/50-0.05, 9/50]=[0.13,0.18]. P(AT,Y1=1)=P(AT,Y0=1) in [0.13,0.18].
# num=21/100-P(AT,Y1=1)+P(NT,Y0=1) in [0.21-0.18+0.07, 0.21-0.13+0.12]=[0.10,0.20]
# LATE in [0.10/0.45, 0.20/0.45]=[2/9, 4/9]. CONFIRME!
print("d=1/20: LATE in [",F(10,100)/F(45,100),",",F(20,100)/F(45,100),"]")
print("2/9=",F(2,9),"4/9=",F(4,9))
</｜｜DSML｜｜ parameter>
</｜｜DSML｜｜ invoke>
</｜｜DSML｜｜ calls>
<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="compute">
<｜｜DSML｜｜ parameter name="code" string="true">
from fractions import Fraction as F
# Verification finale: LATE min global sur d in [0,1/20].
# A d: P(NT)=P(AT)=3/10-d, P(C)=2/5+d, P(Def)=d.
# P(NT,Y1=1)=3/25-P(Def,Y1=1), P(Def,Y1=1) in [0,d] => in [3/25-d, 3/25]
# P(NT,Y0=1)=P(NT,Y1=1) (coherence NT) => in [3/25-d, 3/25]
# P(AT,Y0=1)=9/50-P(Def,Y0=1), P(Def,Y0=1) in [0,d] => in [9/50-d, 9/50]
# P(AT,Y1=1)=P(AT,Y0=1) (coherence AT) => in [9/50-d, 9/50]
# num=21/100-P(AT,Y1=1)+P(NT,Y0=1) in [21/100-(9/50)+3/25-d, 21/100-(9/50-d)+3/25]
# = [21/100-18/100+12/100-d, 21/100-18/100+d+12/100]=[15/100-d, 15/100+d]
# LATE in [(15/100-d)/(2/5+d), (15/100+d)/(2/5+d)]
def lo(d): return (F(15,100)-d)/(F(2,5)+d)
def hi(d): return (F(15,100)+d)/(F(2,5)+d)
# lo decroit en d, hi croit en d. 
print("lo(0)=",lo(F(0)),"lo(1/20)=",lo(F(1,20)))
print("hi(0)=",hi(F(0)),"hi(1/20)=",hi(F(1,20)))
# lo min a d=1/20: (15/100-5/100)/(45/100)=(10/100)/(45/100)=2/9
# hi max a d=1/20: (15/100+5/100)/(45/100)=(20/100)/(45/100)=4/9
print("LATE global in [2/9, 4/9]")
</｜｜DSML｜｜ parameter>
</｜｜DSML｜｜ invoke>
</｜｜DSML｜｜ calls>
<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="compute">
<｜｜DSML｜｜ parameter name="code" string="true">
from fractions import Fraction as F
# Verification finale par LP exhaustif sur les 12 types valides.
from itertools import product
import numpy as np
from scipy.optimize import linprog
obs0={(0,0):F(21,50),(0,1):F(7,25),(1,0):F(3,25),(1,1):F(9,50)}
obs1={(0,0):F(9,50),(0,1):F(3,25),(1,0):F(21,100),(1,1):F(49,100)}
types=[t for t in product([0,1],repeat=4) if not (t[0]==t[1] and t[2]!=t[3])]
n=len(types)
A_eq=[[1]*n]; b_eq=[1.0]
for (d,y),v in obs0.items():
    A_eq.append([1 if (t[0]==d and t[2]==y) else 0 for t in types]); b_eq.append(float(v))
for (d,y),v in obs1.items():
    A_eq.append([1 if (t[1]==d and t[3]==y) else 0 for t in types]); b_eq.append(float(v))
Au=[[1 if (t[0]==1 and t[1]==0) else 0 for t in types]]
obj=[(t[3]-t[2]) for t in types]
rmin=linprog(obj,A_ub=Au,b_ub=[0.05],A_eq=A_eq,b_eq=b_eq,bounds=[(0,None)]*n,method='highs')
rmax=linprog([-x for x in obj],A_ub=Au,b_ub=[0.05],A_eq=A_eq,b_eq=b_eq,bounds=[(0,None)]*n,method='highs')
print("ATE in [",round(rmin.fun,6),",",round(-rmax.fun,6),"]")
# LATE: optimiser sur d
rowC=[1 if (t[0]==0 and t[1]==1) else 0 for t in types]
objL=[(t[3]-t[2]) if (t[0]==0 and t[1]==1) else 0 for t in types]
best=[None,None]
for k in range(0,51):
    d=F(k,1000); PC=F(2,5)+d
    Ae=[r[:] for r in A_eq]+[rowC]; be=list(b_eq)+[float(PC)]
    r1=linprog(objL,A_ub=Au,b_ub=[0.05],A_eq=Ae,b_eq=be,bounds=[(0,None)]*n,method='highs')
    r2=linprog([-x for x in objL],A_ub=Au,b_ub=[0.05],A_eq=Ae,b_eq=be,bounds=[(0,None)]*n,method='highs')
    l=r1.fun/float(PC); h=-r2.fun/float(PC)
    if best[0] is None or l<best[0]: best[0]=l
    if best[1] is None or h>best[1]: best[1]=h
print("LATE in [",round(best[0],6),",",round(best[1],6),"]")
print("2/9=",round(2/9,6),"4/9=",round(4/9,6))
</｜｜DSML｜｜ parameter>
</｜｜DSML｜｜ invoke>
</｜｜DSML｜｜ calls>