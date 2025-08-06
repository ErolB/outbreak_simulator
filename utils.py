import random
import math

class Person:
    def __init__(self):
        self.alive = True
        self.infected = False
        self.immune = False
        self.days_infected = None
    
    def is_alive(self):
        return self.alive
    
    def is_infected(self):
        return self.infected
    
    def is_immune(self):
        return self.immune
    
    def expose(self):
        if self.is_infected():
            return
        if not self.is_immune():
            self.infected = True
            self.days_infected = 0
    
    def death(self):
        self.alive = False
        self.infected = False

    def recover(self):
        self.infected = False
        self.immune = True

    def step(self, illness_length, ifr):
        if self.infected:
            self.days_infected += 1
        if self.infected and self.days_infected >= illness_length:
            if random.random() < ifr:
                self.death()
            else:
                self.recover()

class OutBreak:
    def __init__(self, r0, ifr, illness_length, population_size):
        self.population = [Person() for _ in range(population_size)]
        self.ifr = ifr
        self.illness_length = illness_length
        self.r0 = r0
    
    def run(self, max_days=365):
        infection_history = {}
        death_history = {}
        immunity_history = {}
        # initial infections
        for p in random.sample(self.population, math.ceil(len(self.population)/100)):
            p.expose() 
        # main loop
        for d in range(max_days):
            living_population = [p for p in self.population if p.is_alive()]
            fatalities = [p for p in self.population if not p.is_alive()]
            immune_population = [p for p in living_population if p.is_immune()]
            infected_population = [p for p in living_population if p.is_infected()]
            # update history
            infection_history[d] = len(infected_population) / len(living_population)
            immunity_history[d] = len(immune_population) / len(living_population)
            death_history[d] = len(fatalities) / len(self.population)
            # check for stability
            if d > 14 and (infection_history[d] == 0) and (infection_history[d-1] == 0):
                break
            # update simulation
            for p in living_population:
                p_contact = self.r0 / len(living_population)
                p_daily = 1 - (1-p_contact)**(1/self.illness_length)
                n_contacts = len(living_population) * p_daily
                if n_contacts < 1:
                    if random.random() <= n_contacts:
                        n_contacts = 1
                contacts = random.sample(living_population, int(n_contacts))
                for c in contacts:
                    c.expose()
                p.step(self.illness_length, self.ifr)
        return {'infected': infection_history, 'deaths': death_history, 'immune': immunity_history}
    

if __name__ == '__main__':
    outbreak = OutBreak(1.5, 0.1, 7, 1000)
    print(outbreak.run())




    
